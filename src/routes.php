<?php

// Route::get('SDNIXP', function(){
//     echo 'Hello from the test package!';
// });

use Illuminate\Http\Request;

Route::group( [ 'prefix' => 'sdnixp' ], function() {
    Route::get(     '',                     'SDNIXPController@index'                )->name( 'sdnixp@index' );
    Route::get(     'generateConfig',       'SDNIXPController@generateConfig'       )->name( 'sdnixp@generateConfig' );
    Route::get(     'getFaucetYaml',        'SDNIXPController@getFaucetYaml'        )->name( 'sdnixp@getFaucetYaml' );
    Route::get(     'getTopologyJson',      'SDNIXPController@getTopologyJson'      )->name( 'sdnixp@getTopologyJson' );
    Route::get(     'getLatestLogs',        'SDNIXPController@getLatestLogs'        )->name( 'sdnixp@getLatestLogs' );
    Route::get(     'MxGraph',              'SDNIXPController@MxGraph'              )->name( 'sdnixp@MxGraph' );
    Route::get(     'getXML',               'SDNIXPController@getXML'               )->name( 'sdnixp@getXML' );
    Route::post(    'saveXML',              'SDNIXPController@saveXML'              )->name( 'sdnixp@saveXML' );
    Route::post(    'saveFaucet',           'SDNIXPController@saveFaucet'           )->name( 'sdnixp@saveFaucet' );
    Route::post(    'saveTopo',             'SDNIXPController@saveTopo'             )->name( 'sdnixp@saveTopo' );
    Route::get(     'dashboard',            'SDNIXPController@dashboard'            )->name( 'sdnixp@dashboard');
    Route::get(     'testConfigWithOutput', 'SDNIXPController@testConfigWithOutput' )->name( 'sdnixp@testConfigWithOutput');
});

// Route::get('SDNIXP', 'Belthazaar\SDNIXP\SDNIXPController@index');
