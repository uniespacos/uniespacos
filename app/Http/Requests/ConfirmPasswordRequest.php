<?php

declare(strict_types=1);

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;

class ConfirmPasswordRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return Auth::check();
    }

    public function rules(): array
    {
        return [
            'password' => ['required', 'string'],
        ];
    }

    /**
     * Get custom validation messages.
     */
    public function messages(): array
    {
        return [
            'password.required' => 'A senha é obrigatória para confirmar esta ação.',
        ];
    }

    /**
     * Returns whether the provided password matches the authenticated user's password.
     */
    public function passwordMatches(): bool
    {
        return Hash::check($this->input('password'), Auth::user()->password);
    }
}
