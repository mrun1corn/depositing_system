package com.example.depositapp.ui.view

import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.ViewModelProvider
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKeys
import com.example.depositapp.data.network.RetrofitClient
import com.example.depositapp.data.repository.UserRepository
import com.example.depositapp.databinding.ActivityLoginBinding
import com.example.depositapp.ui.viewmodel.LoginViewModel
import com.example.depositapp.ui.viewmodel.LoginViewModelFactory

class LoginActivity : AppCompatActivity() {

    private lateinit var binding: ActivityLoginBinding
    private lateinit var loginViewModel: LoginViewModel

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityLoginBinding.inflate(layoutInflater)
        setContentView(binding.root)

        val masterKeyAlias = MasterKeys.getOrCreate(MasterKeys.AES256_GCM_SPEC)
        val sharedPreferences = EncryptedSharedPreferences.create(
            "secret_shared_prefs",
            masterKeyAlias,
            applicationContext,
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
        )

        val tokenProvider = { sharedPreferences.getString("jwt_token", null) }
        val apiService = RetrofitClient.getInstance(tokenProvider)
        val userRepository = UserRepository(apiService)
        val factory = LoginViewModelFactory(userRepository)
        loginViewModel = ViewModelProvider(this, factory).get(LoginViewModel::class.java)

        loginViewModel.loginResult.observe(this) { result ->
            result.onSuccess {
                sharedPreferences.edit().putString("jwt_token", it).apply()
                startActivity(Intent(this, DashboardActivity::class.java))
                finish()
            }.onFailure {
                Toast.makeText(this, "Login failed: ${it.message}", Toast.LENGTH_SHORT).show()
            }
        }

        binding.loginButton.setOnClickListener {
            val username = binding.usernameEditText.text.toString()
            val password = binding.passwordEditText.text.toString()
            loginViewModel.login(username, password)
        }
    }
}