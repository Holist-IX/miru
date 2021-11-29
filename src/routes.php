<?php

use Illuminate\Http\Request;

Route::group( [ 'prefix' => 'miru' ], function() {
    Route::get(     '',                         'MiruController@index'                  )->name( 'miru@index' );
    Route::get(     'generateConfig',           'MiruController@runAthos'               )->name( 'miru@runAthos' );
    Route::get(     'getFaucetYaml',            'MiruController@getFaucetYaml'          )->name( 'miru@getFaucetYaml' );
    Route::get(     'getTopologyJson',          'MiruController@getTopologyJson'        )->name( 'miru@getTopologyJson' );
    Route::get(     'getLatestLogs',            'MiruController@getLatestLogs'          )->name( 'miru@getLatestLogs' );
    Route::get(     'getXML',                   'MiruController@getXML'                 )->name( 'miru@getXML' );
    Route::get(     'dashboard',                'MiruController@dashboard'              )->name( 'miru@dashboard');
    Route::get(     'testConfigWithOutput',     'MiruController@testConfigWithOutput'   )->name( 'miru@testConfigWithOutput');
    Route::get(     'Miru',                     'MiruController@Miru'                   )->name( 'miru@Miru' );
    Route::get(     'miru',                     'MiruController@Miru'                   )->name( 'miru@Miru' );
    Route::get(     'getOF',                    'MiruController@getOF'                  )->name( 'miru@getOF' );
    Route::get(     'deploy',                   'MiruController@deploy'                 )->name( 'miru@deploy' );
    Route::post(    'saveXML',                  'MiruController@saveXML'                )->name( 'miru@saveXML' );
    Route::post(    'saveFaucet',               'MiruController@saveFaucet'             )->name( 'miru@saveFaucet' );
    Route::post(    'saveTopo',                 'MiruController@saveTopo'               )->name( 'miru@saveTopo' );
    Route::post(    'pushCerberusConfig',       'MiruController@pushCerberusConfig'     )->name( 'miru@pushCerberusConfig');
    Route::get(     'getCerberusConfig',        'MiruController@getCerberusConfig'      )->name( 'miru@getCerberusConfig');
    Route::get(     'rollbackCerberusConfig',   'MiruController@rollbackCerberusConfig' )->name( 'miru@rollbackCerberusConfig');
});
