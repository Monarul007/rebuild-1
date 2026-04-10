<?php

use Illuminate\Support\Facades\Route;
use Laravel\Fortify\Features;

Route::inertia('/', 'welcome', [
    'canRegister' => Features::enabled(Features::registration()),
])->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::inertia('dashboard', 'dashboard')->name('dashboard');
});

require __DIR__.'/settings.php';

use App\Http\Controllers\AISuggestController;
use App\Http\Controllers\PageController;

Route::resource('pages', PageController::class);
Route::post('/ai/suggest', [AISuggestController::class, 'suggest'])->name('ai.suggest');

