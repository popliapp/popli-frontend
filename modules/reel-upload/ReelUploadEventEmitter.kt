package com.mahak2004.popliapp.reelupload

import android.content.Context
import android.content.Intent
import androidx.localbroadcastmanager.content.LocalBroadcastManager

object ReelUploadEventEmitter {

    const val ACTION = "com.mahak2004.popliapp.REEL_UPLOAD_PROGRESS"
    const val STORY_ACTION = "com.mahak2004.popliapp.STORY_UPLOAD_PROGRESS"
    const val KEY_STATUS = "status"
    const val KEY_CF_STATE = "cf_state"
    const val KEY_PCT = "pct_complete"
    const val KEY_ERROR = "error_message"

    fun emit(context: Context, status: String, cfState: String?, pct: Int?, error: String?) {
        val intent = Intent(ACTION).apply {
            putExtra(KEY_STATUS, status)
            cfState?.let { putExtra(KEY_CF_STATE, it) }
            pct?.let { putExtra(KEY_PCT, it) }
            error?.let { putExtra(KEY_ERROR, it) }
        }
        LocalBroadcastManager.getInstance(context).sendBroadcast(intent)
    }

    fun emitStory(context: Context, status: String, cfState: String?, pct: Int?, error: String?) {
        val intent = Intent(STORY_ACTION).apply {
            putExtra(KEY_STATUS, status)
            cfState?.let { putExtra(KEY_CF_STATE, it) }
            pct?.let { putExtra(KEY_PCT, it) }
            error?.let { putExtra(KEY_ERROR, it) }
        }
        LocalBroadcastManager.getInstance(context).sendBroadcast(intent)
    }
}