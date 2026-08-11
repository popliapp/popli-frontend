package com.mahak2004.popliapp.reelupload

import android.app.Service
import android.content.Intent
import android.os.IBinder
import androidx.work.Constraints
import androidx.work.Data
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkRequest

class ReelUploadService : Service() {

    companion object {
        const val ACTION_START = "com.mahak2004.popliapp.reelupload.START"
        const val ACTION_STOP = "com.mahak2004.popliapp.reelupload.STOP"
        const val ACTION_START_STORY = "com.mahak2004.popliapp.reelupload.START_STORY"
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_START -> {
                val notification = ReelUploadNotificationHelper.buildInitialNotification(this)
                startForeground(
                    ReelUploadNotificationHelper.NOTIFICATION_ID,
                    notification,
                    android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC,
                )

                val localUri = intent.getStringExtra(ReelUploadWorker.KEY_LOCAL_URI) ?: run { stopSelf(); return START_NOT_STICKY }
                val thumbnailUrl = intent.getStringExtra(ReelUploadWorker.KEY_THUMBNAIL_URL)
                val token = intent.getStringExtra(ReelUploadWorker.KEY_TOKEN)
                val baseUrl = intent.getStringExtra(ReelUploadWorker.KEY_BASE_URL) ?: run { stopSelf(); return START_NOT_STICKY }
                val reelPayload = intent.getStringExtra(ReelUploadWorker.KEY_REEL_PAYLOAD) ?: run { stopSelf(); return START_NOT_STICKY }
                val idempotencyKey = intent.getStringExtra(ReelUploadWorker.KEY_IDEMPOTENCY_KEY) ?: run { stopSelf(); return START_NOT_STICKY }
                val taskId = intent.getStringExtra(ReelUploadWorker.KEY_TASK_ID) ?: run { stopSelf(); return START_NOT_STICKY }

                val inputData = Data.Builder()
                    .putString(ReelUploadWorker.KEY_LOCAL_URI, localUri)
                    .putString(ReelUploadWorker.KEY_THUMBNAIL_URL, thumbnailUrl)
                    .putString(ReelUploadWorker.KEY_TOKEN, token)
                    .putString(ReelUploadWorker.KEY_BASE_URL, baseUrl)
                    .putString(ReelUploadWorker.KEY_REEL_PAYLOAD, reelPayload)
                    .putString(ReelUploadWorker.KEY_IDEMPOTENCY_KEY, idempotencyKey)
                    .putString(ReelUploadWorker.KEY_TASK_ID, taskId)
                    .build()

                val constraints = Constraints.Builder()
                    .setRequiredNetworkType(NetworkType.CONNECTED)
                    .build()

                val workRequest: WorkRequest = OneTimeWorkRequestBuilder<ReelUploadWorker>()
                    .setInputData(inputData)
                    .setConstraints(constraints)
                    .addTag("reel_upload_$taskId")
                    .build()

                WorkManager.getInstance(applicationContext).enqueue(workRequest)
                stopSelf()
            }

            ACTION_START_STORY -> {
                val notification = ReelUploadNotificationHelper.buildInitialNotification(this)
                startForeground(
                    ReelUploadNotificationHelper.NOTIFICATION_ID,
                    notification,
                    android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC,
                )

                val localUri = intent.getStringExtra(StoryUploadWorker.KEY_LOCAL_URI) ?: run { stopSelf(); return START_NOT_STICKY }
                val mediaType = intent.getStringExtra(StoryUploadWorker.KEY_MEDIA_TYPE) ?: "IMAGE"
                val token = intent.getStringExtra(StoryUploadWorker.KEY_TOKEN)
                val baseUrl = intent.getStringExtra(StoryUploadWorker.KEY_BASE_URL) ?: run { stopSelf(); return START_NOT_STICKY }
                val storyPayload = intent.getStringExtra(StoryUploadWorker.KEY_STORY_PAYLOAD) ?: run { stopSelf(); return START_NOT_STICKY }
                val idempotencyKey = intent.getStringExtra(StoryUploadWorker.KEY_IDEMPOTENCY_KEY) ?: run { stopSelf(); return START_NOT_STICKY }
                val taskId = intent.getStringExtra(StoryUploadWorker.KEY_TASK_ID) ?: run { stopSelf(); return START_NOT_STICKY }

                val inputData = Data.Builder()
                    .putString(StoryUploadWorker.KEY_LOCAL_URI, localUri)
                    .putString(StoryUploadWorker.KEY_MEDIA_TYPE, mediaType)
                    .putString(StoryUploadWorker.KEY_TOKEN, token)
                    .putString(StoryUploadWorker.KEY_BASE_URL, baseUrl)
                    .putString(StoryUploadWorker.KEY_STORY_PAYLOAD, storyPayload)
                    .putString(StoryUploadWorker.KEY_IDEMPOTENCY_KEY, idempotencyKey)
                    .putString(StoryUploadWorker.KEY_TASK_ID, taskId)
                    .build()

                val constraints = Constraints.Builder()
                    .setRequiredNetworkType(NetworkType.CONNECTED)
                    .build()

                val workRequest: WorkRequest = OneTimeWorkRequestBuilder<StoryUploadWorker>()
                    .setInputData(inputData)
                    .setConstraints(constraints)
                    .addTag("story_upload_$taskId")
                    .build()

                WorkManager.getInstance(applicationContext).enqueue(workRequest)
                stopSelf()
            }

            ACTION_STOP -> {
                stopForeground(STOP_FOREGROUND_REMOVE)
                stopSelf()
            }
        }
        return START_NOT_STICKY
    }

    override fun onBind(intent: Intent?): IBinder? = null
}