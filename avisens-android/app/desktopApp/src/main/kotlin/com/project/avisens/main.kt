package com.project.avisens

import androidx.compose.ui.window.Window
import androidx.compose.ui.window.application
import com.project.avisens.ui.LoginScreen

fun main() = application {
    Window(
        onCloseRequest = ::exitApplication,
        title = "Avisens",
    ) {
        LoginScreen()
    }
}