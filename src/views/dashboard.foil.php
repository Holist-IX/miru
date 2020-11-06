<?php
header( "Location: http://127.0.0.1:6090/" );
exit;

?>

<!-- <?php $this->layout( 'layouts/ixpv4' );
/** @var object $t */
?>


<?php $this->section( 'content' ) ?>

<iframe id="dashboard"
            style="border: none; height: 100%; width: 100%; min-height: 1000px;margin-left: -30px;"
            src="http://127.0.0.1:6090"></iframe>

<?php $this->append() ?> -->
