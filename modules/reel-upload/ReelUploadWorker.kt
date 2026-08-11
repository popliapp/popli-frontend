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

class ReelUploadWorker(
    context: Context,
    params: WorkerParameters,
) : CoroutineWorker(context, params) {

    companion object {
        const val KEY_LOCAL_URI = "local_uri"
        const val KEY_THUMBNAIL_URL = "thumbnail_url"
        const val KEY_TOKEN = "token"
        const val KEY_BASE_URL = "base_url"
        const val KEY_REEL_PAYLOAD = "reel_payload"
        const val KEY_IDEMPOTENCY_KEY = "idempotency_key"
        const val KEY_TASK_ID = "task_id"
        const val PREFS_NAME = "reel_upload_prefs"
        const val PREFS_STATUS = "status"
        const val PREFS_PCT = "pct_complete"
        const val PREFS_CF_STATE = "cf_state"
        const val PREFS_ERROR = "error_message"
        const val PREFS_TASK_ID = "task_id"
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
        ReelUploadEventEmitter.emit(applicationContext, status, cfState, pct, error)
    }

    override suspend fun doWork(): Result = withContext(Dispatchers.IO) {
        val localUri = inputData.getString(KEY_LOCAL_URI) ?: return@withContext Result.failure()
        val thumbnailUrl = inputData.getString(KEY_THUMBNAIL_URL)
        val baseUrl = inputData.getString(KEY_BASE_URL) ?: return@withContext Result.failure()
        val reelPayloadStr = inputData.getString(KEY_REEL_PAYLOAD) ?: return@withContext Result.failure()
        val idempotencyKey = inputData.getString(KEY_IDEMPOTENCY_KEY) ?: return@withContext Result.failure()
        val taskId = inputData.getString(KEY_TASK_ID) ?: return@withContext Result.failure()

        val token = inputData.getString(KEY_TOKEN)

        prefs().edit().putString(PREFS_TASK_ID, taskId).apply()

        try {
            ReelUploadNotificationHelper.showProgress(
                applicationContext,
                "Uploading your Reel...",
                null,
            )
            updatePrefs("uploading")

            val filePath = localUri.removePrefix("file://")
            val file = File(filePath)
            if (!file.exists()) {
                updatePrefs("failed", error = "Video file not found.")
                ReelUploadNotificationHelper.showComplete(applicationContext, false, "Reel upload failed.")
                return@withContext Result.failure()
            }

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
                updatePrefs("failed", error = "Video upload failed.")
                ReelUploadNotificationHelper.showComplete(applicationContext, false, "Reel upload failed.")
                return@withContext Result.failure()
            }

            val uploadJson = JSONObject(uploadBody)
            val uploadId = uploadJson.getString("uploadId")

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
                            ReelUploadNotificationHelper.showProgress(applicationContext, "Saving reel...", 100)
                            break
                        }
                        "error" -> {
                            updatePrefs("failed", cfState = "error", error = "Video processing failed. Please try again.")
                            ReelUploadNotificationHelper.showComplete(applicationContext, false, "Reel upload failed.")
                            return@withContext Result.failure()
                        }
                        "inprogress" -> {
                            updatePrefs("polling", cfState = "inprogress", pct = pct ?: 0)
                            val label = if (pct != null) "Processing video... $pct%" else "Processing video..."
                            ReelUploadNotificationHelper.showProgress(applicationContext, label, pct)
                        }
                        else -> {
                            updatePrefs("polling", cfState = "queued", pct = 0)
                            ReelUploadNotificationHelper.showProgress(applicationContext, "Queued...", null)
                        }
                    }
                } catch (e: Exception) {
                    // network blip — continue polling
                }
            }

            if (assetData == null) {
                updatePrefs("failed", error = "Video processing timed out. Please try again.")
                ReelUploadNotificationHelper.showComplete(applicationContext, false, "Reel upload failed.")
                return@withContext Result.failure()
            }

            val mediaUrl = assetData.optString("mediaUrl", "")
            val assetId = assetData.optString("assetId", "")
            val playbackId = assetData.optString("playbackId", "")
            val duration = assetData.optDouble("duration", 0.0)

            val reelPayload = JSONObject(reelPayloadStr)
            reelPayload.put("mediaUrl", mediaUrl)
            reelPayload.put("thumbnailUrl", thumbnailUrl ?: assetData.optString("thumbnailUrl", mediaUrl))
            reelPayload.put("muxAssetId", assetId)
            reelPayload.put("muxPlaybackId", playbackId)
            reelPayload.put("muxUploadId", uploadId)
            reelPayload.put("durationSeconds", duration.toInt())
            reelPayload.put("idempotencyKey", idempotencyKey)

            val createBody = reelPayload.toString().toRequestBody("application/json".toMediaType())
            val createRequest = Request.Builder()
                .url("$baseUrl/reels")
                .apply { token?.let { header("Authorization", "Bearer $it") } }
                .post(createBody)
                .build()

            val createResponse = client.newCall(createRequest).execute()
            val createBody2 = createResponse.body?.string()

            if (!createResponse.isSuccessful) {
                val msg = try { JSONObject(createBody2 ?: "").optString("message", "Failed to save reel.") } catch (e: Exception) { "Failed to save reel." }
                val safeMsg = getSafeError(msg)
                updatePrefs("failed", error = safeMsg)
                ReelUploadNotificationHelper.showComplete(applicationContext, false, "Reel upload failed.")
                return@withContext Result.failure()
            }

            val createdReel = JSONObject(createBody2 ?: "{}")
            prefs().edit()
                .putString("created_reel_json", createdReel.toString())
                .apply()

            updatePrefs("done", cfState = "ready", pct = 100)
            ReelUploadNotificationHelper.showComplete(applicationContext, true, "Reel posted successfully!")

            return@withContext Result.success(
                workDataOf("reel_id" to createdReel.optString("id", ""))
            )

        } catch (e: Exception) {
            val safeMsg = getSafeError(e.message ?: "")
            updatePrefs("failed", error = safeMsg)
            ReelUploadNotificationHelper.showComplete(applicationContext, false, "Reel upload failed.")
            return@withContext Result.failure()
        }
    }

    private fun getSafeError(raw: String): String {
        return when {
            raw.contains("network", ignoreCase = true) || raw.contains("connect", ignoreCase = true) ->
                "Network connection was lost."
            raw.contains("timeout", ignoreCase = true) ->
                "Video processing timed out. Please try again."
            raw.contains("401", ignoreCase = true) || raw.contains("session", ignoreCase = true) ->
                "Your session expired. Please sign in again."
            raw.contains("processing", ignoreCase = true) || raw.contains("cloudflare", ignoreCase = true) ->
                "Video processing failed. Please try again."
            else -> "Something went wrong. Please try again."
        }
    }
}