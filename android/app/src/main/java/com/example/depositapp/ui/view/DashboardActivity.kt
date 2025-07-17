package com.example.depositapp.ui.view

import android.content.Intent
import android.os.Bundle
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.ViewModelProvider
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKeys
import com.example.depositapp.data.model.Deposit
import com.example.depositapp.data.network.RetrofitClient
import com.example.depositapp.data.repository.DepositRepository
import com.example.depositapp.databinding.ActivityDashboardBinding
import com.example.depositapp.ui.adapter.DepositAdapter
import com.example.depositapp.ui.viewmodel.DepositViewModel
import com.example.depositapp.ui.viewmodel.DepositViewModelFactory

class DashboardActivity : AppCompatActivity() {

    private lateinit var binding: ActivityDashboardBinding
    private lateinit var depositViewModel: DepositViewModel
    private lateinit var depositAdapter: DepositAdapter

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityDashboardBinding.inflate(layoutInflater)
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
        val depositRepository = DepositRepository(apiService)
        val factory = DepositViewModelFactory(depositRepository)
        depositViewModel = ViewModelProvider(this, factory).get(DepositViewModel::class.java)

        setupRecyclerView()
        observeViewModel()

        binding.addDepositButton.setOnClickListener {
            // Handle add deposit (e.g., show dialog)
            val newDeposit = Deposit(
                username = "testuser", // Replace with actual logged-in user
                amount = 100.0,
                paymentDate = "2024-07-18",
                paymentMethod = "Cash"
            )
            depositViewModel.addDeposit(newDeposit)
        }

        binding.logoutButton.setOnClickListener {
            sharedPreferences.edit().remove("jwt_token").apply()
            startActivity(Intent(this, LoginActivity::class.java))
            finish()
        }

        depositViewModel.fetchDeposits()
    }

    private fun setupRecyclerView() {
        depositAdapter = DepositAdapter(mutableListOf()) {
            // Handle edit/delete actions
            Toast.makeText(this, "Deposit clicked: ${it.amount}", Toast.LENGTH_SHORT).show()
        }
        binding.depositsRecyclerView.apply {
            layoutManager = LinearLayoutManager(this@DashboardActivity)
            adapter = depositAdapter
        }
    }

    private fun observeViewModel() {
        depositViewModel.deposits.observe(this) {
            depositAdapter.updateDeposits(it)
            // Update total deposits
            val total = it.sumOf { deposit -> deposit.amount }
            binding.totalDepositsTextView.text = "Total Deposits: $%.2f".format(total)
        }

        depositViewModel.operationResult.observe(this) {
            it.onSuccess {
                Toast.makeText(this, "Operation successful", Toast.LENGTH_SHORT).show()
            }.onFailure {
                Toast.makeText(this, "Operation failed: ${it.message}", Toast.LENGTH_SHORT).show()
            }
        }
    }
}