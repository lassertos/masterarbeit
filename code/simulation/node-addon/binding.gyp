{
    "targets": [
        {
            "target_name": "addon",
            "sources": [
                "src-addon/addon.cc",
                "src-addon/simulation.cc",
                "src-addon/helper.cc",
            ],
            "include_dirs": [
                "/usr/local/include/simavr"
            ],
            "link_settings": {
                "libraries": [
                    "-lsimavr",
                ],
            },
            'dependencies': [
                "<!(node -p \"require('node-addon-api').targets\"):node_addon_api_except",
            ]
        },
    ]
}
