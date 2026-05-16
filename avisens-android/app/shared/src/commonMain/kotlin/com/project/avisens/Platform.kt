package com.project.avisens

interface Platform {
    val name: String
}

expect fun getPlatform(): Platform