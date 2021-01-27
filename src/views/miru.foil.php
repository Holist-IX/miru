
<?php $this->layout( 'layouts/ixpv4' );
/** @var object $t */
?>
<?php $this->section( 'headers')?>
	<script type="text/javascript">
		// Parses URL parameters. Supported parameters are:
		// - lang=xy: Specifies the language of the user interface.
		// - touch=1: Enables a touch-style user interface.
		// - storage=local: Enables HTML5 local storage.
		// - chrome=0: Chromeless mode.
		var urlParams = (function(url)
		{
			var result = new Object();
			var idx = url.lastIndexOf('?');

			if (idx > 0)
			{
				var params = url.substring(idx + 1).split('&');

				for (var i = 0; i < params.length; i++)
				{
					idx = params[i].indexOf('=');

					if (idx > 0)
					{
						result[params[i].substring(0, idx)] = params[i].substring(idx + 1);
					}
				}
			}

			return result;
		})(window.location.href);

		// Default resources are included in grapheditor resources
		mxLoadResources = false;
	</script>
	<script> use_urge = "<?= $t->urge ?>"; d_en = "<?= $t->d_en ?>" </script>
	<script type="text/javascript" src="mxgraph/js/Init.js"></script>
	<script type="text/javascript" src="mxgraph/deflate/pako.min.js"></script>
	<script type="text/javascript" src="mxgraph/deflate/base64.js"></script>
	<script type="text/javascript" src="mxgraph/jscolor/jscolor.js"></script>
	<script type="text/javascript" src="mxgraph/sanitizer/sanitizer.min.js"></script>
	<script type="text/javascript" src="mxgraph/js/mxClient.js"></script>
	<script type="text/javascript" src="mxgraph/js/EditorUi.js"></script>
	<script type="text/javascript" src="mxgraph/js/Editor.js"></script>
	<script type="text/javascript" src="mxgraph/js/Sidebar.js"></script>
	<script type="text/javascript" src="mxgraph/js/Graph.js"></script>
	<script type="text/javascript" src="mxgraph/js/Format.js"></script>
	<script type="text/javascript" src="mxgraph/js/Shapes.js"></script>
	<script type="text/javascript" src="mxgraph/js/Actions.js"></script>
	<script type="text/javascript" src="mxgraph/js/Menus.js"></script>
	<script type="text/javascript" src="mxgraph/js/Toolbar.js"></script>
	<script type="text/javascript" src="mxgraph/js/Dialogs.js"></script>
	<script type="text/javascript" src="mxgraph/js/js-yaml.js"></script>
	<script type="text/javascript" src="mxgraph/js/yaml.js"></script>
	<script type="text/javascript" src="mxgraph/js/ixpapi.js"></script>
	<script type="text/javascript" src="mxgraph/js/umbrella.js"></script>
	<script type="text/javascript" src="mxgraph/js/docker.js"></script>
	<script type="text/javascript" src="mxgraph/js/jquery.min.js"></script>
    <link rel="stylesheet" type="text/css" href="mxgraph/styles/grapheditor.css">
<?php $this->append() ?>

<?php $this->section( 'page-header-preamble' ) ?>
Miru
<?php $this->append() ?>



<?php $this->section( 'content' ) ?>
<!-- <div class="geEditor" style="border: none; height: 100%; width: 100%; min-height: 1000px;margin-left: -30px;"> -->
<div class="geEditor" >
    <div id="editor" style="height: 100%; width: 100%; min-height: 1000px;">
        <script type="text/javascript">
            // Extends EditorUi to update I/O action states based on availability of backend
            (function()
            {
                var editorUiInit = EditorUi.prototype.init;

                EditorUi.prototype.init = function()
                {
                    editorUiInit.apply(this, arguments);
                    this.actions.get('export').setEnabled(false);

                    // Updates action states which require a backend
                    if (!Editor.useLocalStorage)
                    {
                        mxUtils.post(OPEN_URL, '', mxUtils.bind(this, function(req)
                        {
                            var enabled = req.getStatus() != 404;
                            this.actions.get('open').setEnabled(enabled || Graph.fileSupport);
                            this.actions.get('import').setEnabled(enabled || Graph.fileSupport);
                            this.actions.get('save').setEnabled(enabled);
                            this.actions.get('saveAs').setEnabled(enabled);
                            this.actions.get('export').setEnabled(enabled);
                        }));
                    }
                };

                // Adds required resources (disables loading of fallback properties, this can only
                // be used if we know that all keys are defined in the language specific file)
                mxResources.loadDefaultBundle = false;
                var bundle = mxResources.getDefaultBundle(RESOURCE_BASE, mxLanguage) ||
                    mxResources.getSpecialBundle(RESOURCE_BASE, mxLanguage);

                // Fixes possible asynchronous requests
                mxUtils.getAll([bundle, STYLE_PATH + '/default.xml'], function(xhr)
                {
                    // Adds bundle text to resources
                    mxResources.parse(xhr[0].getText());

                    // Configures the default graph theme
                    var themes = new Object();
                    themes[Graph.prototype.defaultThemeName] = xhr[1].getDocumentElement();

                    // Main
                    new EditorUi(new Editor(urlParams['chrome'] == '0', themes));
                }, function()
                {
                    document.body.innerHTML = '<center style="margin-top:10%;">Error loading resource files. Please check browser console.</center>';
                });
            })();
        </script>
    </div>
</div>

<?php $this->append() ?>

<?php $this->section( 'scripts' ) ?>

<script type="text/javascript" src="js/faucet.js"></script>

<?php $this->append() ?>