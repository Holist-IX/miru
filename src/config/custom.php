<?php

/*
 * Copyright (C) 2009 - 2019 Internet Neutral Exchange Association Company Limited By Guarantee.
 * All Rights Reserved.
 *
 * This file is part of IXP Manager.
 *
 * IXP Manager is free software: you can redistribute it and/or modify it
 * under the terms of the GNU General Public License as published by the Free
 * Software Foundation, version v2.0 of the License.
 *
 * IXP Manager is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
 * FITNESS FOR A PARTICULAR PURPOSE.  See the GpNU General Public License for
 * more details.
 *
 * You should have received a copy of the GNU General Public License v2.0
 * along with IXP Manager.  If not, see:
 *
 * http://www.gnu.org/licenses/gpl-2.0.html
 */

/*
 * IXP Manager - custom configuration options.
 *
 * Create your own custom configuration options here and use them in your skinned templates
 * and elsewhere.
 *
 * Just: cp config/custom.php.dist config/custom.php and add options below.
 *
 * In code, these are accessible as: config( "custom.example.key", "default value if not set|null" )
 * In templates, echo with: <?= config( "custom.example.key", "default value if not set|null" ) ?>
 */

return [

    // 'example' => [
    //     'key' => 'my own config value',
    // ],
    'athos' => [
        'dir' => '/athos',
        'api_url' => 'http://127.0.0.1:8989'
    ],
    'cerberus' => [
        'api_url' => 'http://127.0.0.1:8080/api',
    ]
    //'urge' => [
    //    'dir'=> '/urge',
    //],
    //'deploy' => [
    //    'script' => '/urge/script.sh'
    //]
];
