package com.mahak2004.popliapp.reelupload

import android.content.Context
import android.content.SharedPreferences
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import androidx.work.workDataOf
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.MultipartBody
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.asRequestBody
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.io.File
import java.util.concurrent.TimeUnit

class StoryUploadWorker(
    context: Context,
    params: WorkerParameters,
) : CoroutineWorker(context, params) {

    companion object {
        const val KEY_LOCAL_URI = "local_uri"
        const val KEY_MEDIA_TYPE = "media_type"
        const val KEY_TOKEN = "token"
        const val KEY_BASE_URL = "base_url"
        const val KEY_STORY_PAYLOAD = "story_payload"
        const val KEY_IDEMPOTENCY_KEY = "idempotency_key"
        const val KEY_TASK_ID = "task_id"
        const val PREFS_NAME = "story_upload_prefs"
        const val PREFS_STATUS = "status"
        const val PREFS_PCT = "pct_complete"
        const val PREFS_CF_STATE = "cf_state"
        const val PREFS_ERROR = "error_message"
        const val PREFS_TASK_ID = "task_id"
        const val PREFS_CF_VIDEO_ID = "cf_video_id"
    }

    private val client = OkHttpClient.Builder()
        .connectTimeout(60, TimeUnit.SECONDS)
        .readTimeout(120, TimeUnit.SECONDS)
        .writeTimeout(300, TimeUnit.SECONDS)
        .build()

    private fun prefs(): SharedPreferences =
        applicationContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    private fun updatePrefs(status: String, cfState: String? = null, pct: Int? = null, error: String? = null) {
        prefs().edit().apply {
            putString(PREFS_STATUS, status)
            cfState?.let { putString(PREFS_CF_STATE, it) }
            pct?.let { putInt(PREFS_PCT, it) }
            error?.let { putString(PREFS_ERROR, it) }
            apply()
        }
        ReelUploadEventEmitter.emitStory(applicationContext, status, cfState, pct, error)
    }

    override suspend fun doWork(): Result = withContext(Dispatchers.IO) {
        val localUri = inputData.getString(KEY_LOCAL_URI) ?: return@withContext Result.failure()
        val mediaType = inputData.getString(KEY_MEDIA_TYPE) ?: "IMAGE"
        val baseUrl = inputData.getString(KEY_BASE_URL) ?: return@withContext Result.failure()
        val storyPayloadStr = inputData.getString(KEY_STORY_PAYLOAD) ?: return@withContext Result.failure()
        val idempotencyKey = inputData.getString(KEY_IDEMPOTENCY_KEY) ?: return@withContext Result.failure()
        val taskId = inputData.getString(KEY_TASK_ID) ?: return@withContext Result.failure()
        val token = inputData.getString(KEY_TOKEN)

        prefs().edit().putString(PREFS_TASK_ID, taskId).apply()

        try {
            val filePath = localUri.removePrefix("file://")
            val file = File(filePath)
            if (!file.exists()) {
                updatePrefs("failed", error = "Media file not found.")
                ReelUploadNotificationHelper.showComplete(applicationContext, false, "Story upload failed.")
                return@withContext Result.failure()
            }

            val storyPayload = JSONObject(storyPayloadStr)
            var cfVideoId: String? = null

            if (mediaType == "VIDEO") {
                ReelUploadNotificationHelper.showProgress(applicationContext, "Uploading Story video...", null)
                updatePrefs("uploading")

                val requestBody = MultipartBody.Builder()
                    .setType(MultipartBody.FORM)
                    .addFormDataPart(
                        "file",
                        "video.mp4",
                        file.asRequestBody("video/mp4".toMediaType()),
                    )
                    .build()

                val uploadRequest = Request.Builder()
                    .url("$baseUrl/video/upload")
                    .apply { token?.let { header("Authorization", "Bearer $it") } }
                    .post(requestBody)
                    .build()

                val uploadResponse = client.newCall(uploadRequest).execute()
                val uploadBody = uploadResponse.body?.string()

                if (!uploadResponse.isSuccessful || uploadBody == null) {
                    updatePrefs("failed", error = "Story video upload failed.")
                    ReelUploadNotificationHelper.showComplete(applicationContext, false, "Story upload failed.")
                    return@withContext Result.failure()
                }

                val uploadJson = JSONObject(uploadBody)
                val uploadId = uploadJson.getString("uploadId")
                cfVideoId = uploadId
                prefs().edit().putString(PREFS_CF_VIDEO_ID, cfVideoId).apply()

                updatePrefs("polling", cfState = "queued", pct = 0)
                ReelUploadNotificationHelper.showProgress(applicationContext, "Queued...", null)

                var assetData: JSONObject? = null
                var attempts = 0
                val maxAttempts = 40

                while (attempts < maxAttempts) {
                    delay(4000)
                    attempts++
                    try {
                        val pollRequest = Request.Builder()
                            .url("$baseUrl/video/asset?uploadId=$uploadId")
                            .apply { token?.let { header("Authorization", "Bearer $it") } }
                            .get()
                            .build()

                        val pollResponse = client.newCall(pollRequest).execute()
                        val pollBody = pollResponse.body?.string() ?: continue
                        val pollJson = JSONObject(pollBody)
                        val cfState = pollJson.optString("status", "queued")
                        val pctRaw = pollJson.optDouble("pctComplete", -1.0)
                        val pct = if (pctRaw >= 0) pctRaw.toInt() else null

                        when (cfState) {
                            "ready" -> {
                                assetData = pollJson
                                updatePrefs("creating", cfState = "ready", pct = 100)
                                ReelUploadNotificationHelper.showProgress(applicationContext, "Saving Story...", 100)
                                break
                            }
                            "error" -> {
                                updatePrefs("failed", cfState = "error", error = "Story video processing failed. Please try again.")
                                ReelUploadNotificationHelper.showComplete(applicationContext, false, "Story upload failed.")
                                return@withContext Result.failure()
                            }
                            "inprogress" -> {
                                val label = if (pct != null) "Processing Story video... $pct%" else "Processing Story video..."
                                updatePrefs("polling", cfState = "inprogress", pct = pct ?: 0)
                                ReelUploadNotificationHelper.showProgress(applicationContext, label, pct)
                            }
                            else -> {
                                updatePrefs("polling", cfState = "queued", pct = 0)
                                ReelUploadNotificationHelper.showProgress(applicationContext, "Queued...", null)
                            }
                        }
                    } catch (e: Exception) {
                    }
                }

                if (assetData == null) {
                    updatePrefs("failed", error = "Story video processing timed out. Please try again.")
                    ReelUploadNotificationHelper.showComplete(applicationContext, false, "Story upload failed.")
                    return@withContext Result.failure()
                }

                val mediaUrl = assetData.optString("mediaUrl", "")
                storyPayload.put("mediaUrl", mediaUrl)
                storyPayload.put("cfVideoId", cfVideoId)

            } else {
                ReelUploadNotificationHelper.showProgress(applicationContext, "Uploading Story image...", null)
                updatePrefs("uploading")

                val ext = file.extension.lowercase()
                val mimeType = when (ext) {
                    "png" -> "image/png"
                    "webp" -> "image/webp"
                    "gif" -> "image/gif"
                    else -> "image/jpeg"
                }

                val requestBody = MultipartBody.Builder()
                    .setType(MultipartBody.FORM)
                    .addFormDataPart(
                        "file",
                        file.name,
                        file.asRequestBody(mimeType.toMediaType()),
                    )
                    .build()

                val uploadRequest = Request.Builder()
                    .url("$baseUrl/upload/image?folder=stories")
                    .apply { token?.let { header("Authorization", "Bearer $it") } }
                    .post(requestBody)
                    .build()

                val uploadResponse = client.newCall(uploadRequest).execute()
                val uploadBody = uploadResponse.body?.string()

                if (!uploadResponse.isSuccessful || uploadBody == null) {
                    updatePrefs("failed", error = "Story image upload failed.")
                    ReelUploadNotificationHelper.showComplete(applicationContext, false, "Story upload failed.")
                    return@withContext Result.failure()
                }

                val uploadJson = JSONObject(uploadBody)
                val mediaUrl = uploadJson.optString("url", "")
                if (mediaUrl.isEmpty()) {
                    updatePrefs("failed", error = "Story image upload failed.")
                    ReelUploadNotificationHelper.showComplete(applicationContext, false, "Story upload failed.")
                    return@withContext Result.failure()
                }
                storyPayload.put("mediaUrl", mediaUrl)
                updatePrefs("creating")
                ReelUploadNotificationHelper.showProgress(applicationContext, "Saving Story...", null)
            }

            storyPayload.put("idempotencyKey", idempotencyKey)
            if (cfVideoId != null) storyPayload.put("cfVideoId", cfVideoId)

            val createBody = storyPayload.toString().toRequestBody("application/json".toMediaType())
            val createRequest = Request.Builder()
                .url("$baseUrl/stories")
                .apply { token?.let { header("Authorization", "Bearer $it") } }
                .post(createBody)
                .build()

            val createResponse = client.newCall(createRequest).execute()
            val createBodyStr = createResponse.body?.string()

            if (!createResponse.isSuccessful) {
                val msg = try {
                    JSONObject(createBodyStr ?: "").optString("message", "Failed to save Story.")
                } catch (e: Exception) {
                    "Failed to save Story."
                }
                updatePrefs("failed", error = getSafeError(msg))
                ReelUploadNotificationHelper.showComplete(applicationContext, false, "Story upload failed.")
                return@withContext Result.failure()
            }

            val createdStory = JSONObject(createBodyStr ?: "{}")
            prefs().edit()
                .putString("created_story_json", createdStory.toString())
                .apply()

            updatePrefs("done", cfState = if (mediaType == "VIDEO") "ready" else null, pct = 100)
            ReelUploadNotificationHelper.showComplete(applicationContext, true, "Story posted successfully!")

            return@withContext Result.success(
                workDataOf("story_id" to createdStory.optString("id", ""))
            )

        } catch (e: Exception) {
            updatePrefs("failed", error = getSafeError(e.message ?: ""))
            ReelUploadNotificationHelper.showComplete(applicationContext, false, "Story upload failed.")
            return@withContext Result.failure()
        }
    }

    private fun getSafeError(raw: String): String {
        return when {
            raw.contains("network", ignoreCase = true) || raw.contains("connect", ignoreCase = true) ->
                "Network connection was lost."
            raw.contains("timeout", ignoreCase = true) ->
                "Story processing timed out. Please try again."
            raw.contains("401", ignoreCase = true) || raw.contains("session", ignoreCase = true) ->
                "Your session expired. Please sign in again."
            raw.contains("processing", ignoreCase = true) || raw.contains("cloudflare", ignoreCase = true) ->
                "Story video processing failed. Please try again."
            else -> "Something went wrong. Please try again."
        }
    }
}