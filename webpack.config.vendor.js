// jshint esversion: 6
(function () {
    "use strict";
    const webpack = require("webpack");

    (function (webpack1) {
        (function (webpack2, optimize) {
            module.exports = (env) => {
                const path = require("path");
                const ExtractTextPlugin = require("extract-text-webpack-plugin");
                const extractCss = new ExtractTextPlugin("vendor.css");
                const merge = require("webpack-merge");
                const treeShakableModules = [
                    "@angular/animations",
                    "@angular/common",
                    "@angular/compiler",
                    "@angular/core",
                    "@angular/forms",
                    "@angular/http",
                    "@angular/platform-browser",
                    "@angular/platform-browser-dynamic",
                    "@angular/router",
                    "zone.js"
                ];
                const nonTreeShakableModules = [
                    "bootstrap",
                    "bootstrap/dist/css/bootstrap.css",
                    "es6-promise",
                    "es6-shim",
                    "event-source-polyfill",
                    "jquery"
                ];
                const allModules = treeShakableModules.concat(nonTreeShakableModules);
                const isDevMode = !(env && env.prod);
                const sharedConfig = {
                    module: {
                        rules: [{
                            test: /\.(png|woff|woff2|eot|ttf|svg)(\?|$)/,
                            use: "url-loader?limit=100000"
                        }]
                    },
                    output: {
                        publicPath: "dist/",
                        filename: "[name].js",
                        library: "[name]_[hash]"
                    },
                    plugins: [
                        new webpack2.ProvidePlugin({
                            $: "jquery",
                            jQuery: "jquery"
                        }), // Maps these identifiers to the jQuery package (because Bootstrap expects it to be a global variable)
                        new webpack2.ContextReplacementPlugin(/\@angular\b.*\b(bundles|linker)/, path.join(__dirname, "./ClientApp")), // Workaround for https://github.com/angular/angular/issues/11580
                        new webpack2.ContextReplacementPlugin(/angular(\\|\/)core(\\|\/)@angular/, path.join(__dirname, "./ClientApp")), // Workaround for https://github.com/angular/angular/issues/14898
                        new webpack2.IgnorePlugin(/^vertx$/) // Workaround for https://github.com/stefanpenner/es6-promise/issues/100
                    ]
                };

                const clientBundleConfig = merge(sharedConfig, {
                    entry: {
                        // To keep development builds fast, include all vendor dependencies in the vendor bundle.
                        // But for production builds, leave the tree-shakable ones out so the AOT compiler can produce a smaller bundle.
                        vendor: isDevMode ? allModules : nonTreeShakableModules
                    },
                    output: {
                        path: path.join(__dirname, "wwwroot", "dist")
                    },
                    module: {
                        rules: [{
                            test: /\.css(\?|$)/,
                            use: extractCss.extract({
                                use: isDevMode ? "css-loader" : "css-loader?minimize"
                            })
                        }]
                    },
                    plugins: [
                        extractCss,
                        new webpack2.DllPlugin({
                            path: path.join(__dirname, "wwwroot", "dist", '[name]-manifest.json'),
                            name: "[name]_[hash]"
                        })
                    ].concat(isDevMode ? [] : [
                        new optimize.UglifyJsPlugin()
                    ])
                });

                const serverBundleConfig = merge(sharedConfig, {
                    target: "node",
                    resolve: {
                        mainFields: ["main"]
                    },
                    entry: {
                        vendor: allModules.concat(["aspnet-prerendering"])
                    },
                    output: {
                        path: path.join(__dirname, "ClientApp", "dist"),
                        libraryTarget: "commonjs2"
                    },
                    module: {
                        rules: [{
                            test: /\.css(\?|$)/,
                            use: ["to-string-loader", isDevMode ? "css-loader" : "css-loader?minimize"]
                        }]
                    },
                    plugins: [
                        new webpack2.DllPlugin({
                            path: path.join(__dirname, "ClientApp", "dist", "[name]-manifest.json"),
                            name: "[name]_[hash]"
                        })
                    ].concat(isDevMode ? [] : [
                        new optimize.UglifyJsPlugin()
                    ])
                });

                return [clientBundleConfig, serverBundleConfig];
            };
        })(webpack1, webpack1.optimize);
    })(webpack);
}());