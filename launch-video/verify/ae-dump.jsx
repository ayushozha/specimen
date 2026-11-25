// Runs Specimen's After Effects script, then writes what After Effects actually evaluates for every
// keyed property (valueAtTime every 1/120 s) to a JSON file, for comparison with the page's curves.
// Usage (ExtendScript): set SPECIMEN_JSX and DUMP_OUT below via the wrapper, then run.
(function () {
  // A fresh project, so only this bundle's comps are read.
  app.project.close(CloseOptions.DO_NOT_SAVE_CHANGES);
  app.newProject();
  $.evalFile(File(SPECIMEN_JSX));
  var out = [];
  var names = ["Opacity", "Scale", "Rotation", "X Position", "Y Position"];
  for (var i = 1; i <= app.project.numItems; i++) {
    var comp = app.project.item(i);
    if (!(comp instanceof CompItem)) continue;
    // Bottom to top: the order the script added the layers (each new layer goes on top).
    for (var l = comp.numLayers; l >= 1; l--) {
      var layer = comp.layer(l);
      var tr = layer.property("Transform");
      for (var n = 0; n < names.length; n++) {
        var p = tr.property(names[n]);
        if (!p || p.numKeys < 2) continue;
        var t0 = p.keyTime(1), t1 = p.keyTime(p.numKeys);
        var samples = [];
        for (var t = t0; t <= t1 + 1e-9; t += 1 / 120) {
          var v = p.valueAtTime(t, true);
          samples.push([Math.round((t - t0) * 1e6) / 1e6, v instanceof Array ? v[0] : v]);
        }
        out.push('{"comp":' + JSON_str(comp.name) + ',"layer":' + JSON_str(layer.name) + ',"prop":' + JSON_str(names[n]) + ',"start":' + t0 + ',"samples":' + arr(samples) + '}');
      }
    }
  }
  var f = File(DUMP_OUT);
  f.encoding = "UTF-8";
  f.open("w");
  f.write("[" + out.join(",\n") + "]");
  f.close();
  function JSON_str(s) { return '"' + String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '"'; }
  function arr(a) { var r = []; for (var k = 0; k < a.length; k++) r.push("[" + a[k][0] + "," + a[k][1] + "]"); return "[" + r.join(",") + "]"; }
})();
