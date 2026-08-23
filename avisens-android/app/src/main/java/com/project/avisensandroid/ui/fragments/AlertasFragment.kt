package com.project.avisensandroid.ui.fragments

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import com.project.avisensandroid.R
import com.project.avisensandroid.databinding.Po05AlertasOpBinding

class AlertasFragment : BaseBottomNavFragment() {
    private var _binding: Po05AlertasOpBinding? = null
    private val binding get() = _binding!!

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        _binding = Po05AlertasOpBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        configurarBottomNav(R.id.nav_alertas)
        binding.tabActivas.setOnClickListener {
            binding.tabActivas.setBackgroundResource(R.drawable.bg_tab_selected)
            binding.tabHistorial.setBackgroundResource(R.drawable.bg_tabs)
        }
        binding.tabHistorial.setOnClickListener {
            binding.tabHistorial.setBackgroundResource(R.drawable.bg_tab_selected)
            binding.tabActivas.setBackgroundResource(R.drawable.bg_tabs)
        }
    }

    override fun onDestroyView() { super.onDestroyView(); _binding = null }
}
