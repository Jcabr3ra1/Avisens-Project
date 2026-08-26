package com.project.avisensandroid.ui.fragments

import androidx.fragment.app.Fragment
import com.google.android.material.bottomnavigation.BottomNavigationView
import com.project.avisensandroid.R
import com.project.avisensandroid.ui.MainActivity

abstract class BaseBottomNavFragment : Fragment() {

    protected fun configurarBottomNav(itemSeleccionado: Int) {
        val activity = requireActivity() as MainActivity
        val bottomNav = activity.findViewById<BottomNavigationView>(R.id.bottomNav)
        bottomNav.setOnItemSelectedListener { item ->
            if (item.itemId == itemSeleccionado) {
                true
            } else {
                activity.navegarDesdeBottomNav(item.itemId)
                true
            }
        }
        bottomNav.selectedItemId = itemSeleccionado
    }
}
