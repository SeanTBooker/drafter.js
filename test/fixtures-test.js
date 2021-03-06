var assert = require('chai').assert;
var glob = require('glob');
var path = require('path');
var fs = require('fs');
var exec = require('child_process').exec;

var DRAFTER = path.join('ext', 'protagonist', 'drafter', 'bin', 'drafter');
var protagonist = require('protagonist');
var drafter = require('../lib/drafter.nomem.js');

// Loop through all the files, test them, then print a report
var fixtures = [].concat(
  glob.sync('ext/protagonist/drafter/test/**/*.apib'),
  glob.sync('test/fixtures/*.apib')
);

function ms(duration) {
  return duration[0] * 1000 + duration[1] / 1e6;
}

describe('Parse fixture', function () {
  var cppTime = 0;
  var nodeTime = 0;
  var jsTime = 0;

  after(function () {
    console.log();
    console.log('=================');
    console.log('Average JS speed: ' + (jsTime / cppTime).toFixed(1) + ' times slower than C++ (exec) and ' + (jsTime / nodeTime).toFixed(1) + ' times slower than Protagonist');
    console.log('=================');
  });

  fixtures.forEach(function (fixture) {
    var testName = path.join(path.basename(path.dirname(fixture)), path.basename(fixture));

    describe(testName, function () {
      var cppDuration = 0;
      var cppError = null;
      var cppOutput = null;
      var nodeDuration = 0;
      var nodeError = null;
      var nodeOutput = null;
      var jsDuration = 0;
      var jsError = null;
      var jsOutput = null;

      after(function () {
        cppTime += cppDuration;
        nodeTime += nodeDuration;
        jsTime += jsDuration;

        console.log('      C++: ' + cppDuration + 'ms, NODE: ' + nodeDuration + 'ms, JS: ' + jsDuration + 'ms');
        console.log('      JS is ' + (jsDuration / cppDuration).toFixed(1) + ' times slower than C++ and ' + (jsDuration / nodeDuration).toFixed(1) + ' times slower than Protagonist');
      });

      it('C++ parser', function (done) {
        var start = process.hrtime();

        exec(`${DRAFTER} -f json ${fixture}`, function (err, stdout, stderr) {
          var duration = process.hrtime(start);

          try {
            if (stdout) {
              cppOutput = JSON.parse(stdout)
            }

            cppError = err;
            cppDuration = ms(duration);
            done();
          } catch (jsonErr) {
            done(jsonErr);
          }
        });
      });

      it('NODE parser', function (done) {
        fs.readFile(fixture, 'utf8', function (fileErr, data) {
          if (fileErr) {
            return done(fileErr);
          }

          var start = process.hrtime();

          protagonist.parse(data, {}, function (err, result) {
            var duration = process.hrtime(start);

            nodeOutput = result;
            nodeDuration = ms(duration);
            nodeError = err;
            done();
          });
        });
      });

      it('JS parser', function (done) {
        fs.readFile(fixture, 'utf8', function (fileErr, data) {
          if (fileErr) {
            return done(fileErr);
          }

          var start = process.hrtime();

          drafter.parse(data, function (err, result) {
            var duration = process.hrtime(start);

            jsOutput = result;
            jsDuration = ms(duration);
            jsError = err;
            done();
          });
        });
      });

      describe('JS vs CPP', function () {
        it('should be good', function () {
          if (!jsError) {
            assert.deepEqual(jsOutput, cppOutput);
          } else {
            assert.isNull(jsError, 'JS parsing failed');
            assert.isNull(cppError, 'CPP parsing failed');
          }
        });
      });

      describe('JS vs NODE', function () {
        it('should be good', function () {
          assert.deepEqual(jsOutput, nodeOutput);
          assert.deepEqual(jsError, nodeError);
        });
      });
    });
  });
});
