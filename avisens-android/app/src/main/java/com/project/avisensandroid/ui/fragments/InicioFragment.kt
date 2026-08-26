package com.project.avisensandroid.ui.fragments

import android.graphics.Color
import android.os.Bundle
import android.view.View
import android.widget.AdapterView
import android.widget.ArrayAdapter
import android.widget.LinearLayout
import android.widget.TextView
import com.project.avisensandroid.R
import com.project.avisensandroid.databinding.Po01InicioOpBinding
import com.project.avisensandroid.ui.MainActivity

class InicioFragment : BaseBottomNavFragment() {
    private var _binding: Po01InicioOpBinding? = null
    private val binding get() = _binding!!

    override fun onCreateView(inflater: android.view.LayoutInflater, container: android.view.ViewGroup?, savedInstanceState: Bundle?): View {
        _binding = Po01InicioOpBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        val activity = requireActivity() as MainActivity
        configurarSpinner(activity)
        configurarGalpones()
        configurarBottomNav(R.id.nav_inicio)

        binding.btnPerfil.setOnClickListener { activity.mostrarConfiguracion() }
    }

    private fun configurarSpinner(activity: MainActivity) {
        val granjas = activity.resources.getStringArray(R.array.granjas)
        val adapter = ArrayAdapter(activity, android.R.layout.simple_spinner_item, granjas)
        adapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item)
        binding.spinnerGranjas.adapter = adapter
        binding.spinnerGranjas.onItemSelectedListener = object : AdapterView.OnItemSelectedListener {
            override fun onItemSelected(parent: AdapterView<*>?, view: View?, position: Int, id: Long) {}
            override fun onNothingSelected(parent: AdapterView<*>?) {}
        }
    }

    private fun configurarGalpones() {
        val galpones = listOf(binding.btnGalponNorte, binding.btnGalponSur, binding.btnGalponEste, binding.btnGalponOeste)
        galpones.forEach { galpon ->
            galpon.setOnClickListener {
                galpones.forEach { otro ->
                    val seleccionado = otro == galpon
                    otro.setBackgroundResource(if (seleccionado) R.drawable.bg_galpon_selected else R.drawable.bg_galpon_unselected)
                    if (otro.childCount > 0) otro.getChildAt(0).visibility = if (seleccionado) View.VISIBLE else View.INVISIBLE
                    cambiarColorTexto(otro, Color.WHITE)
                }
            }
        }
    }

    private fun cambiarColorTexto(galpon: LinearLayout, color: Int) {
        for (i in 0 until galpon.childCount) {
            val child = galpon.getChildAt(i)
            if (child is TextView) child.setTextColor(color)
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
