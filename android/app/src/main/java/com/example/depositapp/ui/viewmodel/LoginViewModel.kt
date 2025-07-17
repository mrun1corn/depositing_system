package com.example.depositapp.ui.viewmodel

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.depositapp.data.repository.UserRepository
import kotlinx.coroutines.launch

class LoginViewModel(private val userRepository: UserRepository) : ViewModel() {

    private val _loginResult = MutableLiveData<Result<String>>() // Result<token>
    val loginResult: LiveData<Result<String>> = _loginResult

    fun login(username: String, password: String) {
        viewModelScope.launch {
            try {
                val response = userRepository.login(username, password)
                if (response.isSuccessful) {
                    response.body()?.token?.let { token ->
                        _loginResult.postValue(Result.success(token))
                    } ?: _loginResult.postValue(Result.failure(Exception("Token not found")))
                } else {
                    _loginResult.postValue(Result.failure(Exception(response.errorBody()?.string() ?: "Login failed")))
                }
            } catch (e: Exception) {
                _loginResult.postValue(Result.failure(e))
            }
        }
    }
}