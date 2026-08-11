package com.mahak2004.popliapp.reelupload

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import androidx.core.app.NotificationCompat
import com.mahak2004.popliapp.R

object ReelUploadNotificationHelper {

    const val CHANNEL_ID = "reel_upload_channel"
    const val NOTIFICATION_ID = 7788

    fun ensureChannel(context: Context) {
        val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        if (manager.getNotificationChannel(CHANNEL_ID) == null) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Reel Upload",
                NotificationManager.IMPORTANCE_LOW,
            ).apply {
                description = "Shows Reel upload progress"
                setShowBadge(false)
                setSound(null, null)
            }
            manager.createNotificationChannel(channel)
        }
    }

    fun buildInitialNotification(context: Context): Notification {
        ensureChannel(context)
        return NotificationCompat.Builder(context, CHANNEL_ID)
            .setContentTitle("Popli")
            .setContentText("Starting Reel upload...")
            .setSmallIcon(R.mipmap.ic_launcher)
            .setOngoing(true)
            .setSilent(true)
            .build()
    }

    fun showProgress(context: Context, message: String, pct: Int?) {
        ensureChannel(context)
        val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        val builder = NotificationCompat.Builder(context, CHANNEL_ID)
            .setContentTitle("Popli")
            .setContentText(message)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setOngoing(true)
            .setSilent(true)

        if (pct != null) {
            builder.setProgress(100, pct, false)
        } else {
            builder.setProgress(100, 0, true)
        }

        manager.notify(NOTIFICATION_ID, builder.build())
    }

    fun showComplete(context: Context, success: Boolean, message: String) {
        ensureChannel(context)
        val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        val notification = NotificationCompat.Builder(context, CHANNEL_ID)
            .setContentTitle("Popli")
            .setContentText(message)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setOngoing(false)
            .setAutoCancel(true)
            .setProgress(0, 0, false)
            .build()
        manager.notify(NOTIFICATION_ID, notification)
    }
}