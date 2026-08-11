package com.mahak2004.popliapp.reelupload

import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.content.BroadcastReceiver
import android.content.IntentFilter
import androidx.localbroadcastmanager.content.LocalBroadcastManager
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule

class ReelUploadModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName() = "ReelUploadModule"

    private val reelReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context, intent: Intent) {
            if (!reactContext.hasActiveReactInstance()) return
            val map = Arguments.createMap().apply {
                putString("status", intent.getStringExtra(ReelUploadEventEmitter.KEY_STATUS))
                putString("cfState", intent.getStringExtra(ReelUploadEventEmitter.KEY_CF_STATE))
                val pct = intent.getIntExtra(ReelUploadEventEmitter.KEY_PCT, -1)
                if (pct >= 0) putInt("pctComplete", pct)
                intent.getStringExtra(ReelUploadEventEmitter.KEY_ERROR)?.let { putString("errorMessage", it) }
            }
            reactContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit("ReelUploadProgress", map)
        }
    }

    private val storyReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context, intent: Intent) {
            if (!reactContext.hasActiveReactInstance()) return
            val map = Arguments.createMap().apply {
                putString("status", intent.getStringExtra(ReelUploadEventEmitter.KEY_STATUS))
                putString("cfState", intent.getStringExtra(ReelUploadEventEmitter.KEY_CF_STATE))
                val pct = intent.getIntExtra(ReelUploadEventEmitter.KEY_PCT, -1)
                if (pct >= 0) putInt("pctComplete", pct)
                intent.getStringExtra(ReelUploadEventEmitter.KEY_ERROR)?.let { putString("errorMessage", it) }
            }
            reactContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit("StoryUploadProgress", map)
        }
    }

    @ReactMethod
    fun startUpload(params: ReadableMap, promise: Promise) {
        try {
            val localUri = params.getString("localUri") ?: throw IllegalArgumentException("localUri required")
            val baseUrl = params.getString("baseUrl") ?: throw IllegalArgumentException("baseUrl required")
            val token = params.getString("token")
            val reelPayload = params.getString("reelPayload") ?: throw IllegalArgumentException("reelPayload required")
            val idempotencyKey = params.getString("idempotencyKey") ?: throw IllegalArgumentException("idempotencyKey required")
            val taskId = params.getString("taskId") ?: idempotencyKey
            val thumbnailUrl = params.getString("thumbnailUrl")

            val intent = Intent(reactContext, ReelUploadService::class.java).apply {
                action = ReelUploadService.ACTION_START
                putExtra(ReelUploadWorker.KEY_LOCAL_URI, localUri)
                putExtra(ReelUploadWorker.KEY_BASE_URL, baseUrl)
                putExtra(ReelUploadWorker.KEY_TOKEN, token)
                putExtra(ReelUploadWorker.KEY_REEL_PAYLOAD, reelPayload)
                putExtra(ReelUploadWorker.KEY_IDEMPOTENCY_KEY, idempotencyKey)
                putExtra(ReelUploadWorker.KEY_TASK_ID, taskId)
                putExtra(ReelUploadWorker.KEY_THUMBNAIL_URL, thumbnailUrl)
            }
            reactContext.startForegroundService(intent)
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("START_FAILED", e.message, e)
        }
    }

    @ReactMethod
    fun startStoryUpload(params: ReadableMap, promise: Promise) {
        try {
            val localUri = params.getString("localUri") ?: throw IllegalArgumentException("localUri required")
            val baseUrl = params.getString("baseUrl") ?: throw IllegalArgumentException("baseUrl required")
            val token = params.getString("token")
            val storyPayload = params.getString("storyPayload") ?: throw IllegalArgumentException("storyPayload required")
            val idempotencyKey = params.getString("idempotencyKey") ?: throw IllegalArgumentException("idempotencyKey required")
            val taskId = params.getString("taskId") ?: idempotencyKey
            val mediaType = params.getString("mediaType") ?: "IMAGE"

            val intent = Intent(reactContext, ReelUploadService::class.java).apply {
                action = ReelUploadService.ACTION_START_STORY
                putExtra(StoryUploadWorker.KEY_LOCAL_URI, localUri)
                putExtra(StoryUploadWorker.KEY_MEDIA_TYPE, mediaType)
                putExtra(StoryUploadWorker.KEY_BASE_URL, baseUrl)
                putExtra(StoryUploadWorker.KEY_TOKEN, token)
                putExtra(StoryUploadWorker.KEY_STORY_PAYLOAD, storyPayload)
                putExtra(StoryUploadWorker.KEY_IDEMPOTENCY_KEY, idempotencyKey)
                putExtra(StoryUploadWorker.KEY_TASK_ID, taskId)
            }
            reactContext.startForegroundService(intent)
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("START_STORY_FAILED", e.message, e)
        }
    }

    @ReactMethod
    fun getCurrentStatus(promise: Promise) {
        val prefs: SharedPreferences = reactContext.getSharedPreferences(
            ReelUploadWorker.PREFS_NAME, Context.MODE_PRIVATE
        )
        val map = Arguments.createMap().apply {
            putString("status", prefs.getString(ReelUploadWorker.PREFS_STATUS, "idle"))
            putString("cfState", prefs.getString(ReelUploadWorker.PREFS_CF_STATE, null))
            putInt("pctComplete", prefs.getInt(ReelUploadWorker.PREFS_PCT, 0))
            putString("errorMessage", prefs.getString(ReelUploadWorker.PREFS_ERROR, null))
            putString("taskId", prefs.getString(ReelUploadWorker.PREFS_TASK_ID, null))
            putString("createdReelJson", prefs.getString("created_reel_json", null))
        }
        promise.resolve(map)
    }

    @ReactMethod
    fun getStoryStatus(promise: Promise) {
        val prefs: SharedPreferences = reactContext.getSharedPreferences(
            StoryUploadWorker.PREFS_NAME, Context.MODE_PRIVATE
        )
        val map = Arguments.createMap().apply {
            putString("status", prefs.getString(StoryUploadWorker.PREFS_STATUS, "idle"))
            putString("cfState", prefs.getString(StoryUploadWorker.PREFS_CF_STATE, null))
            putInt("pctComplete", prefs.getInt(StoryUploadWorker.PREFS_PCT, 0))
            putString("errorMessage", prefs.getString(StoryUploadWorker.PREFS_ERROR, null))
            putString("taskId", prefs.getString(StoryUploadWorker.PREFS_TASK_ID, null))
            putString("createdStoryJson", prefs.getString("created_story_json", null))
        }
        promise.resolve(map)
    }

    @ReactMethod
    fun clearStatus(promise: Promise) {
        reactContext.getSharedPreferences(ReelUploadWorker.PREFS_NAME, Context.MODE_PRIVATE)
            .edit().clear().apply()
        promise.resolve(null)
    }

    @ReactMethod
    fun clearStoryStatus(promise: Promise) {
        reactContext.getSharedPreferences(StoryUploadWorker.PREFS_NAME, Context.MODE_PRIVATE)
            .edit().clear().apply()
        promise.resolve(null)
    }

    @ReactMethod
    fun addListener(eventName: String) {
        when (eventName) {
            "ReelUploadProgress" -> LocalBroadcastManager.getInstance(reactContext)
                .registerReceiver(reelReceiver, IntentFilter(ReelUploadEventEmitter.ACTION))
            "StoryUploadProgress" -> LocalBroadcastManager.getInstance(reactContext)
                .registerReceiver(storyReceiver, IntentFilter(ReelUploadEventEmitter.STORY_ACTION))
        }
    }

    @ReactMethod
    fun removeListeners(count: Int) {
        try { LocalBroadcastManager.getInstance(reactContext).unregisterReceiver(reelReceiver) } catch (e: Exception) {}
        try { LocalBroadcastManager.getInstance(reactContext).unregisterReceiver(storyReceiver) } catch (e: Exception) {}
    }
}