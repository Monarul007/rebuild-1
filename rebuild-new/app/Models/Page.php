<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Page extends Model
{
    protected $fillable = ['title', 'schema', 'published_at'];

    protected function casts(): array
    {
        return [
            'schema'       => 'array',
            'published_at' => 'datetime',
        ];
    }
}
