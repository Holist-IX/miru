<?php

namespace Holistix\Miru;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Route;

use IXP\Providers\IxpServiceProvider;

use Auth, Cache, D2EM, View;

use IXP\Models\Customer;
use IXP\Models\User;

// use Entities\{
//     Customer    as CustomerEntity,
//     User as UserEntity
// };

class MiruServiceProvider extends IxpServiceProvider
{
    /**
     * Register services.
     *
     * @return void
     */

    public function register(): void
    {
        //
        $this->app->make('Holistix\Miru\MiruController');
        $this->loadViewsFrom(__DIR__.'/views', 'miru');

        $this->app->resolving('view', function($view) {

            View::composer('*', function($view) {
                if( ( Auth::check() && Auth::getUser()->isSuperUser() ) || env( 'IXP_PHPUNIT_RUNNING', false ) ) {

                    // get an array of customer id => names
                    if( !( $customers = Cache::get( 'admin_home_customers' ) ) ) {
                        $customers = D2EM::getRepository( CustomerEntity::class )->getNames( true );
                        Cache::put( 'admin_home_customers', $customers, 3600 );
                    }

                    $view->with( 'dd_customer_id_name', $customers );
                }

            });

        $this->mapMiruRoutes();
        });
    }

    /**
     * Bootstrap services.
     *
     * @return void
     */
    public function boot():void{}

    protected function mapMiruRoutes()
    {
        Route::group([
                        'middleware' => config( 'google2fa.enabled' ) ? [ 'web' , 'auth' , '2fa' , 'assert.privilege:' . User::AUTH_SUPERUSER ] : [ 'web' , 'auth', 'assert.privilege:' . User::AUTH_SUPERUSER ],
                        'namespace' => 'Holistix\Miru'
                    ], function ($router) {
                include __DIR__.'/routes.php';
        });
    }

}