package com.project.avisensandroid.ui.fragments

import android.os.Bundle
import android.view.View
import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.fragment.app.Fragment
import com.project.avisensandroid.R
import com.project.avisensandroid.databinding.Po02SensoresOpBinding

class SensoresFragment : BaseBottomNavFragment() {
    private var _binding: Po02SensoresOpBinding? = null
    private val binding get() = _binding!!

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        _binding = Po02SensoresOpBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        configurarBottomNav(R.id.nav_sensores)
        actualizarTemperatura(24f)
    }

    private fun actualizarTemperatura(valor: Float) {
        binding.arcTemperatura.setTemperature(valor)
        binding.txtTemperatura.text = "${valor.toInt()}°"
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
