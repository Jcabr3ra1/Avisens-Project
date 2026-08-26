package com.project.avisensandroid.ui.fragments

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import com.project.avisensandroid.R
import com.project.avisensandroid.databinding.Po03BodegaOpBinding
import com.project.avisensandroid.ui.MainActivity

class BodegaFragment : BaseBottomNavFragment() {
    private var _binding: Po03BodegaOpBinding? = null
    private val binding get() = _binding!!

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        _binding = Po03BodegaOpBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        val activity = requireActivity() as MainActivity
        configurarBottomNav(R.id.nav_bodega)
        binding.btnProveedores.setOnClickListener { activity.mostrarFragment(ProveedoresFragment()) }
        binding.btnInsumos.setOnClickListener { /* ya estamos en insumos */ }
        binding.btnNuevoInsumo.setOnClickListener { activity.mostrarDialogNuevoInsumo() }
    }

    override fun onDestroyView() { super.onDestroyView(); _binding = null }
}
