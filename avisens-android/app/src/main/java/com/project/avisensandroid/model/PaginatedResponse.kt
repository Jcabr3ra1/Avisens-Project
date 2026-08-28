package com.project.avisensandroid.model

data class PaginatedResponse<T>(
    val data: List<T>,
    val meta: PaginationMeta
)

data class PaginationMeta(
    val total: Int,
    val page: Int,
    val limit: Int,
    val totalPages: Int
)