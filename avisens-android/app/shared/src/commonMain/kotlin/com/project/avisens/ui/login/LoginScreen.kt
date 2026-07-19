package com.project.avisens.ui.login

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import com.project.avisens.core.network.ApiResultado
import com.project.avisens.core.network.AvisensError
import com.project.avisens.di.ServiceLocator
import kotlinx.coroutines.launch

// Pantalla mínima de login. Obtiene el repositorio del ServiceLocator (no lo
// construye ella misma). baseUrl por defecto = localhost (escritorio);
// en emulador Android usar 10.0.2.2.
@Composable
fun LoginScreen(baseUrl: String = "http://localhost:3000/") {
    val scope = rememberCoroutineScope()
    val repo = remember(baseUrl) { ServiceLocator.authRepository(baseUrl) }

    var email by remember { mutableStateOf("admin@avisens.com") }
    var password by remember { mutableStateOf("Admin1234!") }
    var mensaje by remember { mutableStateOf<String?>(null) }
    var cargando by remember { mutableStateOf(false) }

    MaterialTheme {
        Column(
            modifier = Modifier.fillMaxSize().padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
        ) {
            Text("Avisens", style = MaterialTheme.typography.headlineMedium)
            Spacer(Modifier.height(16.dp))
            OutlinedTextField(
                value = email,
                onValueChange = { email = it },
                label = { Text("Correo") },
                singleLine = true,
            )
            Spacer(Modifier.height(8.dp))
            OutlinedTextField(
                value = password,
                onValueChange = { password = it },
                label = { Text("Contraseña") },
                singleLine = true,
                visualTransformation = PasswordVisualTransformation(),
            )
            Spacer(Modifier.height(16.dp))
            Button(
                enabled = !cargando,
                onClick = {
                    scope.launch {
                        cargando = true
                        mensaje = when (val r = repo.login(email.trim(), password)) {
                            is ApiResultado.Exito -> "Bienvenido, ${r.dato.nombre} (${r.dato.rol})"
                            is ApiResultado.Error -> textoError(r.error)
                        }
                        cargando = false
                    }
                },
            ) {
                Text(if (cargando) "Entrando..." else "Entrar")
            }
            mensaje?.let {
                Spacer(Modifier.height(16.dp))
                Text(it)
            }
        }
    }
}

private fun textoError(error: AvisensError): String = when (error) {
    is AvisensError.Validacion -> error.mensajes.joinToString("; ")
    AvisensError.NoAutorizado -> "Credenciales invalidas"
    AvisensError.Prohibido -> "No tienes permiso"
    AvisensError.NoEncontrado -> "No encontrado"
    is AvisensError.Conflicto -> error.mensaje
    AvisensError.SinConexion -> "Sin conexion con el servidor"
    AvisensError.Servidor -> "El servidor no responde"
    is AvisensError.Desconocido -> "Error: ${error.mensaje}"
}
