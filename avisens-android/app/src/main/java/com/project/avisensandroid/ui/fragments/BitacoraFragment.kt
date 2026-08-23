package com.project.avisensandroid.ui.fragments

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import com.project.avisensandroid.R
import com.project.avisensandroid.databinding.Po06BitacoraMortalidadOpBinding
import com.project.avisensandroid.ui.MainActivity

class BitacoraFragment : BaseBottomNavFragment() {
    private var _binding: Po06BitacoraMortalidadOpBinding? = null
    private val binding get() = _binding!!

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        _binding = Po06BitacoraMortalidadOpBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        val activity = requireActivity() as MainActivity
        configurarBottomNav(R.id.nav_bitacora)
        binding.tbnConsumo.setOnClickListener { activity.mostrarFragment(BitacoraConsumoFragment()) }
        binding.btnRegistrarEvento.setOnClickListener { activity.mostrarDialogRegistrarEvento() }
    }

    override fun onDestroyView() { super.onDestroyView(); _binding = null }
}
