/*jslint node:true*/

module.exports = function (grunt) {

    'use strict';

    grunt.loadNpmTasks('grunt-jslint'); // load the task

    grunt.initConfig({

        jslint: {
            files: [
                'meta.json'
            ],
            options: {
                failOnError: true
            }
        }

    });

    // default task.
    grunt.registerTask('default', 'jslint');

    // Travis CI task.
    grunt.registerTask('travis', 'jslint');

};