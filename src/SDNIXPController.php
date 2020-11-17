<?php

namespace Belthazaar\SDNIXP;

use Illuminate\Http\Request; 

use Illuminate\Http\RedirectResponse;

use IXP\Http\Controllers\{
    App,
    Auth,
    Controller,
    D2EM
};

use Illuminate\View\View;
use IXP\Utils\View\Alert\Alert;
use IXP\Utils\View\Alert\Container as AlertContainer;

use Illuminate\Auth\Access\AuthorizationException;

use Symfony\Component\Process\Process;
use Symfony\Component\Process\ProcessFailedException;

/**
 * SDNIXP Controller
 * @author Christoff Visser <christoff@iij.ad.jp>
 * @category SDN IXP
 */

class SDNIXPController extends Controller
{
    public function index(): View
    {
        return view('sdnixp::index');
    }
    //

    public function MxGraph(): View
    {
        return view('sdnixp::mxg');
    }

    public function generateConfig()
    {
        $process = new Process("bash /home/ixpman/code/networkTester/ixpman.sh");
        $process->run();
        
        if (!$process->isSuccesful()) {
            throw new ProcessFailedException($process);
        }
        $out = $process->getOutput();
        return $out;
    }

    public function testConfigWithOutput()
    {
        header('X-Accel-Buffering: no');
        $proc = popen("bash /home/ixpman/code/networkTester/ixpman.sh output", 'r');

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

    public function getFaucetYaml()
    {
        $fpath = "/home/ixpman/code/networkTester/etc/faucet/faucet.yaml";
        $file = fopen($fpath, "r");
        $out = fread($file, filesize($fpath));
        fclose($file);
        return $out;
    }
 
    public function getTopologyJson()
    {
        $fpath = "/home/ixpman/code/networkTester/etc/mixtt/topology.json";
        $file = fopen($fpath, "r");
        $out = fread($file, filesize($fpath));
        fclose($file);
        return $out;
    }
 
    public function getXML()
    {
        $fpath = "/home/ixpman/code/networkTester/etc/mixtt/graph.xml";
        $file = fopen($fpath, "r") or die("Unable to open the file");
        $out = fread($file,filesize($fpath));
        fclose($file);
        return $out;
    }
 
    public function getLatestLogs()
    {
        $fpath = "/home/ixpman/code/networkTester/ixpman_files/output.txt";
        $file = fopen($fpath, "r");
        $out = fread($file,filesize($fpath));
        fclose($file);
        return $out;
    }
 
    public function saveFaucet( Request $request) {
        file_put_contents("/home/ixpman/code/networkTester/etc/faucet/faucet.yaml", ($request->input('msg')));
        $out = readfile("/home/ixpman/code/networkTester/etc/faucet/faucet.yaml");
        return $out;
    }
 
    public function saveTopo( Request $request) {
        file_put_contents("/home/ixpman/code/networkTester/etc/mixtt/topology.json", ($request->input('msg')));
        $out = readfile("/home/ixpman/code/networkTester/etc/mixtt/topology.json");
        return $out;
    }
 
    public function saveXML( Request $request) {
        file_put_contents("/home/ixpman/code/networkTester/etc/mixtt/graph.xml", ($request->input('msg')));
        $out = readfile("/home/ixpman/code/networkTester/etc/mixtt/graph.xml");
        return $out;
    }

    public function dashboard(): View {
        return view('sdnixp::dashboard');
    }

}


