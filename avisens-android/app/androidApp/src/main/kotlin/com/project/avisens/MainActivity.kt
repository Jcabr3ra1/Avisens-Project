package com.project.avisens

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import com.project.avisens.ui.login.LoginScreen

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)

        setContent {
            // En emulador, el backend del PC se alcanza en 10.0.2.2 (no localhost).
            LoginScreen(baseUrl = "http://10.0.2.2:3000/")
        }
    }
}

@Preview
@Composable
fun AppAndroidPreview() {
    LoginScreen()
}