<?php

// Route::get('SDNIXP', function(){
//     echo 'Hello from the test package!';
// });

use Illuminate\Http\Request;

Route::group( [ 'prefix' => 'sdnixp' ], function() {
    Route::get(     '',                     'SDNIXPController@index'                )->name( 'sdnixp@index' );
    Route::get(     'generateConfig',       'SDNIXPController@runAthos'             )->name( 'sdnixp@runAthos' );
    Route::get(     'getFaucetYaml',        'SDNIXPController@getFaucetYaml'        )->name( 'sdnixp@getFaucetYaml' );
    Route::get(     'getTopologyJson',      'SDNIXPController@getTopologyJson'      )->name( 'sdnixp@getTopologyJson' );
    Route::get(     'getLatestLogs',        'SDNIXPController@getLatestLogs'        )->name( 'sdnixp@getLatestLogs' );
    Route::get(     'getXML',               'SDNIXPController@getXML'               )->name( 'sdnixp@getXML' );
    Route::get(     'dashboard',            'SDNIXPController@dashboard'            )->name( 'sdnixp@dashboard');
    Route::get(     'testConfigWithOutput', 'SDNIXPController@testConfigWithOutput' )->name( 'sdnixp@testConfigWithOutput');
    Route::get(     'Miru',                 'SDNIXPController@Miru'                 )->name( 'sdnixp@Miru' );
    Route::get(     'miru',                 'SDNIXPController@Miru'                 )->name( 'sdnixp@Miru' );
    Route::get(     'getOF',                'SDNIXPController@getOF'                )->name( 'sdnixp@getOF' );
    Route::get(     'deploy',               'SDNIXPController@deploy'               )->name( 'sdnixp@deploy' );
    Route::post(    'saveXML',              'SDNIXPController@saveXML'              )->name( 'sdnixp@saveXML' );
    Route::post(    'saveFaucet',           'SDNIXPController@saveFaucet'           )->name( 'sdnixp@saveFaucet' );
    Route::post(    'saveTopo',             'SDNIXPController@saveTopo'             )->name( 'sdnixp@saveTopo' );
});
