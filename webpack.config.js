require('dotenv').config()
const path = require("path");
const UserscriptWebpackPlugin = require("./bin/UserscriptWebpackPlugin");
const TerserPlugin = require("terser-webpack-plugin");
const metadata = require("./bin/userscript-header");

const isDev = process.env.NODE_ENV == "development";

const files = [];
files.push({
    entry: "./src/RE621.ts",
    mode: isDev ? "development" : "production",
    devtool: false,
    plugins: [
        new UserscriptWebpackPlugin({ metadata }),
    ],
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: "ts-loader",
                exclude: /node_modules/,
            },
            {
                test: /.scss$/,
                exclude: /node_modules/,
                use: [
                    "sass-to-string",
                    {
                        loader: "sass-loader",
                        options: {
                            sassOptions: { outputStyle: "compressed", },
                        },
                    },
                ],
            },
        ],
    },
    resolve: {
        extensions: [".tsx", ".ts", ".js"],
    },
    output: {
        filename: "script.user.js",
        path: path.resolve(__dirname, "dist"),
    },
    optimization: {
        minimize: !isDev,
        minimizer: [
            (compiler) => {
                new TerserPlugin({
                    terserOptions: {
                        format: { comments: false },
                        keep_classnames: true,
                    },
                    extractComments: false,
                }).apply(compiler);
            }
        ]
    },
    externals: [
        "../../ZestyAPI/dist/ZestyAPI",
    ],
    cache: true,
});

if (isDev) {
    metadata.name = "re621 Injector";
    metadata.version = "10.0.0";
    delete metadata.updateURL;
    delete metadata.downloadURL;

    if (process.env.INJ_TARGET == "firefox") metadata.require.push("http://localhost:7000/script.user.js");
    else metadata.require.push("file://" + path.resolve(__dirname, "dist/script.user.js"));

    files.push({
        entry: "./bin/empty.js",
        mode: "production",
        plugins: [
            new UserscriptWebpackPlugin({ metadata }),
        ],
        output: {
            filename: "injector.meta.js",
            path: path.resolve(__dirname, "dist"),
        },
    });
} else files.push({
    entry: "./bin/empty.js",
    mode: "production",
    plugins: [
        new UserscriptWebpackPlugin({ metadata }),
    ],
    output: {
        filename: "script.meta.js",
        path: path.resolve(__dirname, "dist"),
    },
});

module.exports = files;
