package com.project.avisens.sample

interface Platform {
    val name: String
}

expect fun getPlatform(): Platform