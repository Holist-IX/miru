## Miru (Holsitix)

The Holistix is a full stack solution for Internet exchanges. It is built on top of IXP Manager and compromises of two main components, a php package designed to be incorporated with IXP Manager (Miru) and an automated network tester (Athos). This repo will primarily focus on Miru.

## Requirements

Ubuntu <= 20.04  
IXP Manager <= 5.7.0  
docker <= 19.0

## Install process

### IXP Manager
This guide will be based on and follow on from the [IXP Manager install instructions](https://docs.ixpmanager.org/install/automated-script/). The install instructions uses the default install location as below, change it as is appropriate:

```
IXPROOT=/srv/ixpmanager
MY_WWW_USER=www-data
```

### Miru

- Clone the git repository into `$IXPROOT/vendor/belthazaar`
- Edit `$IXPROOT/composer.json` and add `"Belthazaar\\SDNIXP\\": "packages/belthazaar/sdnixp/src"` to "autoload": "psr-4" as below

```JSON
    "autoload": {
        "classmap": [
            "database/seeds",
            "database",
            "database"
        ],
        "psr-4": {
             "IXP\\": "app/",
             "SocialiteProviders\\PeeringDB\\": "data/SocialiteProviders/PeeringDB/",
             "Belthazaar\\SDNIXP\\": "vendor/belthazaar/sdnixp/src"
       },
        "files": [
            "app/Support/helpers.php"
        ]
     },
```

- Edit $IXPROOT/config/app.php and add the following under 'providers'  
    `Belthazaar\SDNIXP\SDNIXPServiceProvider::class,`
- Edit `$IXPROOT/.env`, uncomment and change `VIEW_SKIN=sdnixp`
- Run the following to finish installation

``` bash
composer dump-autoload 
composer install
```

The packages is now installed however we still need to do a couple more steps so that we can have access to it within IXP Manager. Now we need to add the inlcuded skins from the package to be able to use the Miru package.

The script below will set a softlink within IXP Manager's skinning folder, this helps keeps the relavant parts updated as Miru gets updated, it will also clear out the caches so our skins will load

```bash
ln -s ${IXPROOT}/vendor/belthazaar/sdnixp/src/skins/sdnixp ${IXPROOT}/resources/skins/sdnixp
ln -s ${IXPROOT}/vendor/belthazaar/sdnixp/src/config/custom.php ${IXPROOT}/config/custom.php

ln -s ${IXPROOT}/vendor/belthazaar/sdnixp/src/js/faucet.js ${IXPROOT}/public/js/faucet.js
ln -s ${IXPROOT}/vendor/belthazaar/sdnixp/src/js/mxgraph ${IXPROOT}/public/mxgraph

chown -R $MY_WWW_USER: ${IXPROOT}/resources/skins/sdnixp
chmod -R ug+rw ${IXPROOT}/resources/skins/sdnixp
chown -R $MY_WWW_USER: ${IXPROOT}/resources/skins/sdnixp
chmod -R ug+rw ${IXPROOT}/resources/skins/sdnixp

# Restart IXP Manager for new skin to take effect
php ${IXPROOT}/artisan down --message='Please wait, currently upgrading...'

# Clear all caches to ensure everything is working
systemctl restart memcached.service
php ${IXPROOT}/artisan cache:clear
php ${IXPROOT}/artisan config:clear
php ${IXPROOT}/artisan doctrine:clear:metadata:cache
php ${IXPROOT}/artisan doctrine:clear:query:cache
php ${IXPROOT}/artisan doctrine:clear:result:cache
php ${IXPROOT}/artisan route:clear
php ${IXPROOT}/artisan view:clear

php ${IXPROOT}/artisan up
```

The default installation expects Athos to be installed at `/athos`. To change this to a different directory, change `${IXPROOT}/config/custom.php`. The defualt configuration also includes examples of options if you intend to use Miru with Urge, or want to deploy configurations from within Miru.


## Usage

IXP Manager needs to be setup with at least 1 infrastructure, facility, rack and switch setup in order to use it.

After the initial setup process is complete, you will be able to access Miru from the HIX link at the bottom of the sidebar on the left. From here you can open the Miru interface. 

When you first open Miru you will be greeted with a blank canvas, and Miru will add any switches found within IXP Manager. The switch object will be populated with all of the information associated with it within IXP Manager, including name, loopback addresses, hostname, all of the members connected to the switch, and all ports that have been designated as "core" ports for internal links between switches. These switch objects can be dragged and dropped on to the canvas.

> _Note:_ Currently there is no way in IXP Manager to declare datapath ids (dpids). If you intend to use the config generated as is for production, right click on the switch object on the canvas, click on `Edit Data...` -> `Add Property` and add a property with the key "dpid" and the value with the switch's dpid. 

Switches can be connected by hovering over a switch object and then click and dragging one of the arrows that appears and connecting it to another switch. Miru will find available ports on both of the switches and associate those together as a line. If the link comes back as `undefined` please ensure that each switch has at least 1 port that is set to `core` and is not currently being used by another link.

If you would like to change the ports that Miru has selected, you can right click on the link and select `Edit link between switches` and choose from the available ports. If the port you want is not there, please check if it is allocated to another link, if not please ensure that it has been designated as a `Core` port within IXP Manager.

Once you have a topology that you are happy with you can generate the configs from the `File` -> `Generate config`. Configurations will be stored within `$ATHOSROOT`, as well as a copy of the current diagram topology that will be loaded next time Miru is opened.

> _Note:_ If this step fail it is most likely due to permision issues. Ensure that `$MY_WWW_USER` has permision to read and write in `$ATHOSROOT`

If the configuration has been generated successfully, you can start Athos with feedback through `File`->`Run Athos with output`. Miru will start an Athos instance and test the config that has been generated. 

After the tests have run, the option to download logs, and configs will be made available. If a deployment script is setup within `custom.php`, the option to run it will be available.

