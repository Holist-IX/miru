<?php

namespace Holistix\Miru;

use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

use Illuminate\Http\RedirectResponse;

use IXP\Http\Controllers\{
    App,
    Auth,
    Controller
};

use IXP\Models\Switcher;
use IXP\Models\Log;
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
        $sw_array = Switcher::where( 'active', true )
            ->orderBy( 'name' )->get()
            ->keyBy( 'id' );

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
        $sw_array = Switcher::where( 'active', true )
            ->orderBy( 'name' )->get()
            ->keyBy( 'id' );
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
        if (config("custom.athos.api_url") != NULL or config("custom.athos.api_url") != ""){
            $curl = curl_init();
            $url = sprintf("%s/%s", config("custom.athos.api_url"), "run_athos");
            $result = '';
            $callback = function($ch, $str) {
                global $result;
                $result .= $str;
                echo $str;
                @ flush();
                return strlen($str);
            };

            curl_setopt($curl, CURLOPT_URL, $url);
            curl_setopt($curl, CURLOPT_CUSTOMREQUEST, 'GET');
            curl_setopt($curl, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($curl, CURLOPT_WRITEFUNCTION, $callback);

            curl_exec($curl);

            curl_close($curl);

        } else {
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
        $out = "";
        if (config("custom.athos.api_url") != NULL or config("custom.athos.api_url") != ""){
            $curl = curl_init();
            $url = sprintf("%s/%s", config("custom.athos.api_url"), "get_xml");


            curl_setopt($curl, CURLOPT_URL, $url);
            curl_setopt($curl, CURLOPT_CUSTOMREQUEST, 'GET');
            curl_setopt($curl, CURLOPT_RETURNTRANSFER, true);

            $out = curl_exec($curl);

            curl_close($curl);

        } else {
            $dir = config("custom.athos.dir", "/athos");
            $fpath = "$dir/etc/athos/graph.xml";
            // Checks if an xml file has been setup before
            if (is_file($fpath)) {
                $file = fopen($fpath, "r") or die("Unable to open the file");
                $out = fread($file,filesize($fpath));
                fclose($file);
            }
        }
        if ($out != "")
        {
            return $out;
        }
        else
        {
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
        if (config("custom.athos.api_url") != NULL or config("custom.athos.api_url") != ""){
            $curl = curl_init();
            $url = sprintf("%s/%s", config("custom.athos.api_url"), "get_logs");

            curl_setopt($curl, CURLOPT_URL, $url);
            curl_setopt($curl, CURLOPT_CUSTOMREQUEST, 'GET');
            curl_setopt($curl, CURLOPT_RETURNTRANSFER, true);


            curl_exec($curl);

            curl_close($curl);
        }
        else
        {
            $dir = config("custom.athos.dir", "/athos");
            $fpath = "$dir/ixpman_files/output.txt";
            $file = fopen($fpath, "r");
            $out = fread($file,filesize($fpath));
            fclose($file);
            return $out;
        }

    }

    /**
     * saveFaucet
     * Saves the designated faucet file into Athos
     * @param  mixed $request
     * @return void
     */
    public function saveFaucet( Request $request) {
        if (config("custom.athos.api_url") != NULL or config("custom.athos.api_url") != ""){
            $curl = curl_init();
            $url = sprintf("%s/%s", config("custom.athos.api_url"), "save_faucet");

            curl_setopt($curl, CURLOPT_URL, $url);
            curl_setopt($curl, CURLOPT_CUSTOMREQUEST, 'PUT');
            curl_setopt($curl, CURLOPT_POSTFIELDS, $request->input('msg'));
            curl_setopt($curl, CURLOPT_RETURNTRANSFER, true);

            $proc = curl_exec($curl);

            $err = curl_error($curl);
            curl_close($curl);
            if ($err) {
                return $err;
            }
            else {
                return $proc;
            }
        } else {
            $dir = config("custom.athos.dir", "/athos");
            $fileName = "$dir/etc/faucet/faucet.yaml";
            $faucetFile = fopen($fileName, "w+");
            fwrite($faucetFile, ($request->input('msg')));
            $out = readfile($fileName);
            return $out;
        }

    }

    /**
     * saveTopo
     * Saves the topology configuration file into Athos
     * @param  mixed $request
     * @return void
     */
    public function saveTopo( Request $request) {
        $debug_file = "/athos/debug.txt";
        $debug = fopen($debug_file, "w+");
        fwrite($debug, $request->input('msg'));

        if (config("custom.athos.api_url") != NULL or config("custom.athos.api_url") != "") {
            $curl = curl_init();
            $url = sprintf("%s/%s", config("custom.athos.api_url"), "push_config");

            curl_setopt($curl, CURLOPT_URL, $url);
            curl_setopt($curl, CURLOPT_CUSTOMREQUEST, 'PUT');
            curl_setopt($curl, CURLOPT_POSTFIELDS, $request->input('msg'));
            curl_setopt($curl, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($curl, CURLOPT_HTTPHEADER, array(
                'Content-Type: application/json',
                'Content-Length: ' . strlen($request->input('msg'))
            ));

            $proc = curl_exec($curl);

            $err = curl_error($curl);
            curl_close($curl);
            if ($err) {
                return $err;
            }
            else {
                return $proc;
            }
        } else {
            $dir = config("custom.athos.dir", "/athos");
            $fileName = "$dir/etc/athos/topology.json";
            $topoFile = fopen($fileName, "w+");
            fwrite($topoFile, ($request->input('msg')));
            $out = readfile($fileName);
            return $out;
        }

    }

    /**
     * saveXML
     * Saves XML file into Athos to load on next startup of Miru
     * @param  mixed $request
     * @return
     */
    public function saveXML( Request $request) {

        if (config("custom.athos.api_url") != NULL or config("custom.athos.api_url") != "") {
            $curl = curl_init();
            $url = sprintf("%s/%s", config("custom.athos.api_url"), "save_xml");

            curl_setopt($curl, CURLOPT_URL, $url);
            curl_setopt($curl, CURLOPT_CUSTOMREQUEST, 'PUT');
            curl_setopt($curl, CURLOPT_POSTFIELDS, $request->input('msg'));
	        curl_setopt($curl, CURLOPT_RETURNTRANSFER, true);
	        curl_setopt($curl, CURLOPT_HTTPHEADER, array(
		        'Content-Type: text/plain',
		        'Content-Length: ' . strlen($request->input('msg'))
 	        ));

            $proc = curl_exec($curl);

            $err = curl_error($curl);
            curl_close($curl);
            if ($err) {
                return $err;
            }
            else {
                return $proc;
            }

    	} else {

            $dir = config("custom.athos.dir", "/athos");
            $fileName = "$dir/etc/athos/graph.xml";
            $graphFile = fopen($fileName, "w+");
            fwrite($graphFile, ($request->input('msg')));
            $out = readfile($fileName);
            return $out;
	    }
    }

    public function dashboard(): View {
        return view('miru::dashboard');
    }


    public function getCerberusConfig(Request $request): JsonResponse {

        $curl = curl_init();
        $url = sprintf("%s/%s", config("custom.cerberus.api_url"), "get_config");

        curl_setopt($curl, CURLOPT_URL, $url);
        curl_setopt($curl, CURLOPT_RETURNTRANSFER, true);

        $result = curl_exec($curl);

        $cleanedResponse = json_decode($result, true);
        $err = curl_error($curl);
        curl_close($curl);

        return response()->json( $cleanedResponse);
    }

    public function pushCerberusConfig(Request $request): JsonResponse {

        $curl = curl_init();
        $url = sprintf("%s/%s", config("custom.cerberus.api_url"), "push_config");

        curl_setopt($curl, CURLOPT_URL, $url);
        curl_setopt($curl, CURLOPT_CUSTOMREQUEST, 'PUT');
        curl_setopt($curl, CURLOPT_POSTFIELDS, $request->input('msg'));
        curl_setopt($curl, CURLOPT_RETURNTRANSFER, true);

        $result = curl_exec($curl);

        $cleanedResponse = json_decode($result, true);

        $err = curl_error($curl);
        curl_close($curl);

        return response()->json( $cleanedResponse);
    }

    public function rollbackCerberusConfig(Request $request): JsonResponse {

        $curl = curl_init();
        $url = sprintf("%s/%s", config("custom.cerberus.api_url"), "rollback_to_last_config");

        curl_setopt($curl, CURLOPT_URL, $url);
        curl_setopt($curl, CURLOPT_RETURNTRANSFER, true);

        $result = curl_exec($curl);

        $cleanedResponse = json_decode($result, true);

        $err = curl_error($curl);
        curl_close($curl);

        return response()->json( $cleanedResponse);
    }


}