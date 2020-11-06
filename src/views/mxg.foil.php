<?php $this->layout( 'layouts/ixpv4' );
/** @var object $t */
?>

<?php $this->section( 'page-header-preamble' ) ?>
Faucet Configuration Generator
<?php $this->append() ?>



<?php $this->section( 'content' ) ?>

<iframe id="mxg"
            style="border: none; height: 100%; width: 100%; min-height: 1000px;margin-left: -30px;"
            src="/mxgraph"></iframe>

<?php $this->append() ?>


<?php $this->section( 'scripts' ) ?>

<script type="text/javascript" src="js/faucet.js"></script>

<?php $this->append() ?>