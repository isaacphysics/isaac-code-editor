// Generated using webpack-cli https://github.com/webpack/webpack-cli

const path = require('path');
const isProduction = process.env.NODE_ENV == 'production';
const stylesHandler = 'style-loader';

const HtmlWebpackPlugin = require('html-webpack-plugin');

const config = {
    entry: './src/index.tsx',
    output: {
        clean: true,
        path: path.resolve(__dirname, 'dist'),
        publicPath: '/',
    },
    devServer: {
        host: 'localhost',
        allowedHosts: "all"
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: 'public/index.html',
        }),
    ],
    module: {
        rules: [
            {
                test: /\.(ts|tsx)$/i,
                loader: 'ts-loader',
                exclude: ['/node_modules/'],
            },
            {
                test: /\.s[ac]ss$/i,
                use: [stylesHandler, 'css-loader', 'sass-loader'],
            },
            {
                test: /\.(eot|svg|ttf|woff|woff2|png|jpg|gif)$/i,
                type: 'asset',
            },

            // Add your rules for custom modules here
            // Learn more about loaders from https://webpack.js.org/loaders/
        ],
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.jsx', '.js', '...'],
    },
    ignoreWarnings: [
        { message: /mixed-decls/ },
        { message: /repetitive deprecation warnings/ },
    ],
};

module.exports = () => {
    if (isProduction) {
        config.mode = 'production';
        
    } else {
        config.mode = 'development';
    }
    return config;
};
