package com.dbsound.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import com.dbsound.app.navigation.DBSoundApp
import com.dbsound.app.presentation.ui.theme.DBSoundTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            DBSoundTheme {
                DBSoundApp()
            }
        }
    }
}
