<?php $this->layout( 'layouts/ixpv4' );
/** @var object $t */
?>

<?php $this->section( 'page-header-preamble' ) ?>
Faucet Configuration Generator
<?php $this->append() ?>



<?php $this->section( 'content' ) ?>
<style>
    .loading {
        font-size: 1.5em;
    }
</style>
<div class="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
    <h3>Miru</h3>

</div>
<div class="container-fluid">
    <div class="col-sm-12">
        <div class="row">
            <div class="col-12">
                <div class="row tw-mb-6">
                    <p>Opens Miru</p>
                </div>
                <div class="row tw-mb-6">
                    <a class="btn btn-white" type="button" href="<?= route( 'miru@Miru' ) ?>"> To Miru </a>
                </div>
                <div class="row tw-mb-6">
                    <p>Download the latest Faucet config that has been generated </p>
                </div>
                <div class="row tw-mb-6">
                    <a class="btn btn-white" type="button" onclick="getYaml()"> Get faucet.yaml </a>
                </div>
                <div class="row tw-mb-6">
                    <p>Download the latest topology file that has been generated </p>
                </div>
                <div class="row tw-mb-6">
                    <a class="btn btn-white" type="button" onclick="getTopology()"> Get topology.json</a>
                </div>
                <div class="row tw-mb-6">
                    <p>Download the latest logs for the most recent Athos simulation </p>
                </div>
                <div class="row tw-mb-6">
                    <a class="btn btn-white" type="button" onclick="getLogs()"> Get Logs </a>
                </div>
                <div class="row tw-mb-6">
                    <p>Download the graph XML config for the most recent Athos simulation </p>
                </div>
                <div class="row tw-mb-6">
                    <a class="btn btn-white" type="button" onclick="getXML()"> Get graph xml </a>
                </div>
            </div>
        </div>
    </div>
</div>

<?php $this->append() ?>


<?php $this->section( 'scripts' ) ?>

<script type="text/javascript" src="js/faucet.js"></script>


<?php $this->append() ?>