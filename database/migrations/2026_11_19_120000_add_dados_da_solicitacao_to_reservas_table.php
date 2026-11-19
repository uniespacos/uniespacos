<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Colunas nullable, sem default e sem índice: ADD COLUMN no Postgres é só metadado.
// O rollback usa a imagem anterior, que ignora estas colunas, por isso precisam ser opcionais.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('reservas', function (Blueprint $table) {
            if (! Schema::hasColumn('reservas', 'publico_estimado')) {
                $table->integer('publico_estimado')->nullable();
            }

            if (! Schema::hasColumn('reservas', 'categoria')) {
                $table->string('categoria', 100)->nullable();
            }

            if (! Schema::hasColumn('reservas', 'termo_aceito_em')) {
                $table->timestamp('termo_aceito_em')->nullable();
            }
        });
    }

    public function down(): void
    {
        Schema::table('reservas', function (Blueprint $table) {
            foreach (['publico_estimado', 'categoria', 'termo_aceito_em'] as $coluna) {
                if (Schema::hasColumn('reservas', $coluna)) {
                    $table->dropColumn($coluna);
                }
            }
        });
    }
};
