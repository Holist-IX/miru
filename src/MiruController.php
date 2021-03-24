<?php

namespace Holistix\Miru;

use Illuminate\Http\Request;

use Illuminate\Http\RedirectResponse;

use D2EM;

use IXP\Http\Controllers\{
    App,
    Auth,
    Controller
};

use Entities\{
    Switcher    as SwitcherEntity
};
use Illuminate\View\View;
use IXP\Utils\View\Alert\Alert;
use IXP\Utils\View\Alert\Container as AlertContainer;

use Illuminate\Auth\Access\AuthorizationException;

use Symfony\Component\Process\Process;
use Symfony\Component\Process\ProcessFailedException;

/**
 * Miru Controller
 * @author Christoff Visser <christoff@iij.ad.jp>
 * @category Miru
 */

class MiruController extends Controller
{
    /**
     * index
     * Shows index view
     * @return View
     */
    public function index(): View
    {
        $URGE = false;
        $deploy = false;
        // Find switches that's been configured and are active
        $sw_array = array();
        foreach (D2EM::getRepository( SwitcherEntity::class )->getFiltered(true) as $sw){
            $sw_array[ $sw->getName() ] = $sw->getId();
        }
        $switches = json_encode($sw_array);
        // Checks if urge has been configured
        if (config("custom.urge.dir") != NULL or config("custom.urge.dir") != ""){
            $URGE = true;
        }
        // Checks if a deploy script has been configured
        if (config("custom.deploy.script") != NULL or config("custom.deploy.script") != ""){
            $deploy = true;
        }

        return view('miru::miru')->with([
            'urge' => $URGE,
            'd_en' => $deploy,
            'switches' => $switches
        ]);
    }


    /**
     * Miru
     * Returns view that contains Miru javascript
     * @return View
     */
    public function Miru(): View
    {
        $URGE = false;
        $deploy = false;
        // Find switches that's been configured and are active
        $sw_array = array();
        foreach (D2EM::getRepository( SwitcherEntity::class )->getFiltered(true) as $sw){
            $sw_array[ $sw->getName() ] = $sw->getId();
        }
        $switches = json_encode($sw_array);
        // Checks if urge has been configured
        if (config("custom.urge.dir") != NULL or config("custom.urge.dir") != ""){
            $URGE = true;
        }
        // Checks if a deploy script has been configured
        if (config("custom.deploy.script") != NULL or config("custom.deploy.script") != ""){
            $deploy = true;
        }

        return view('miru::miru')->with([
            'urge' => $URGE,
            'd_en' => $deploy,
            'switches' => $switches
        ]);
    }


    /**
     * runAthos
     * Starts an Athos instance and returns the result
     * @return string
     */
    public function runAthos()
    {
        $dir = config("custom.athos.dir", "/athos");
        $proc_name = "$dir/ixpman.sh";
        $process = new Process("bash $proc_name");
        $process->run();

        if (!$process->isSuccesful()) {
            throw new ProcessFailedException($process);
        }
        $out = $process->getOutput();
        return $out;
    }


    /**
     * testConfigWithOutput
     * Runs athos and streams the output back to the frontend
     * @return string
     */
    public function testConfigWithOutput()
    {
        header('X-Accel-Buffering: no');
        $dir = config("custom.athos.dir", "/athos");
        $urge_dir = config("custom.urge.dir");
        if ($urge_dir != NULL or $urge_dir != "")
        {
            $proc_name = "$dir/runDocker.sh urge";
        }
        else
        {
            $proc_name = "$dir/runDocker.sh output";
        }

        $proc = popen("bash $proc_name", 'r');

        $live_output     = "";
        $complete_output = "";

        while (!feof($proc))
        {
            $live_output     = fread($proc, 1024);
            $complete_output = $complete_output . $live_output;
            echo $live_output;
            @ flush();
        }

        pclose($proc);
    }


    /**
     * deploy
     * Runs the deployment script specified in custom.php
     * @return void
     */
    public function deploy()
    {
        header('X-Accel-Buffering: no');
        $deploy_script = config("custom.deploy.script");
        if ($deploy_script != NULL or $deploy_script != "")
        {
            $proc = popen("bash $deploy_script", 'r');
            $live_output = "";
            $complete_output = "";

            while (!feof($proc))
            {
                $live_output = fread($proc, 1024);
                $complete_output = $complete_output . $live_output;
                echo $live_output;
                @ flush();
            }
            pclose($proc);
        }
        else
        {
            echo "No deploy script is set up";
        }
    }

    /**
     * getFaucetYaml
     * Retrieves the latest facet config and sends it to the front end
     * @return string
     */
    public function getFaucetYaml()
    {
        $dir = config("custom.athos.dir", "/athos");
        $fpath = "$dir/etc/faucet/faucet.yaml";
        $file = fopen($fpath, "r");
        $out = fread($file, filesize($fpath));
        fclose($file);
        return $out;
    }

    /**
     * getOF
     * Retrieves the latest OpenFlow rules generated by Urge and sends it to the frontend
     * @return zip
     */
    public function getOF()
    {
        $dir = config("custom.urge.dir");
        if ($deploy_script != NULL or $deploy_script != "")
        {
            $fpath = "$dir/rules.zip";
            $file = fopen($fpath, "r");
            $out = fread($file, filesize($fpath));
            fclose($file);
            return $out;
        }
        else
        {
            return false;
        }
    }

    /**
     * getTopologyJson
     * Retrieves the latest Topology config generated and returns it to the frontend
     * @return void
     */
    public function getTopologyJson()
    {
        $dir = config("custom.athos.dir", "/athos");
        $fpath = "$dir/etc/athos/topology.json";
        $file = fopen($fpath, "r");
        $out = fread($file, filesize($fpath));
        fclose($file);
        return $out;
    }

    /**
     * getXML
     * Retrieves the latest XML file generated and returns it to the frontend
     * @return void
     */
    public function getXML()
    {
        $dir = config("custom.athos.dir", "/athos");
        $fpath = "$dir/etc/athos/graph.xml";
        // Checks if an xml file has been setup before
        if (is_file($fpath)) {
            $file = fopen($fpath, "r") or die("Unable to open the file");
            $out = fread($file,filesize($fpath));
            fclose($file);
            return $out;
        }
        else {
            return false;
        }
    }

    /**
     * getLatestLogs
     * Retrieves the latest Athos logs and returns it to the frontend
     * @return void
     */
    public function getLatestLogs()
    {
        $dir = config("custom.athos.dir", "/athos");
        $fpath = "$dir/ixpman_files/output.txt";
        $file = fopen($fpath, "r");
        $out = fread($file,filesize($fpath));
        fclose($file);
        return $out;
    }

    /**
     * saveFaucet
     * Saves the designated faucet file into Athos
     * @param  mixed $request
     * @return void
     */
    public function saveFaucet( Request $request) {
        $dir = config("custom.athos.dir", "/athos");
        $fileName = "$dir/etc/faucet/faucet.yaml";
        $faucetFile = fopen($fileName, "w+");
        // file_put_contents($faucetFile, ($request->input('msg')));
        // chmod($fileName, 0664);
        fwrite($faucetFile, ($request->input('msg')));
        $out = readfile($fileName);
        return $out;
    }

    /**
     * saveTopo
     * Saves the topology configuration file into Athos
     * @param  mixed $request
     * @return void
     */
    public function saveTopo( Request $request) {
        $dir = config("custom.athos.dir", "/athos");
        $fileName = "$dir/etc/athos/topology.json";
        $topologyFile = fopen($fileName, "w+");
        // chmod($fileName, 0664);
        // file_put_contents($topologyFile, ($request->input('msg')));
        fwrite($topologyFile, ($request->input('msg')));
        $out = readfile($fileName);
        return $out;
    }

    /**
     * saveXML
     * Saves XML file into Athos to load on next startup of Miru
     * @param  mixed $request
     * @return
     */
    public function saveXML( Request $request) {
        $dir = config("custom.athos.dir", "/athos");
        $fileName = "$dir/etc/athos/graph.xml";
        $graphFile = fopen($fileName, "w+");
        // chmod($fileName, 0664);
        // file_put_contents("$dir/etc/mixtt/graph.xml", ($request->input('msg')));
        fwrite($graphFile, ($request->input('msg')));
        $out = readfile($fileName);
        return $out;
    }

    public function dashboard(): View {
        return view('miru::dashboard');
    }

}
