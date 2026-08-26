{
  "targets": [
    {
      "target_name": "simulation_addon",
      "sources": [ 
        "native/addon.cc", 
        "native/models.cpp" 
      ],
      "include_dirs": [
        "<!@(node -p \"require('node-addon-api').include\")",
        "native",
        "C:/vcpkg/installed/x64-windows-static/include"
      ],
      "dependencies": [
        "<!(node -p \"require('node-addon-api').gyp\")"
      ],
      "defines": [ "NAPI_CPP_EXCEPTIONS" ],
      "msvs_settings": {
        "VCCLCompilerTool": {
          "ExceptionHandling": 1,
          "AdditionalOptions": [ "/EHsc" ]
        }
      },
      "conditions": [
        ['OS=="win"', {
          "libraries": [
            "-lC:/vcpkg/installed/x64-windows-static/lib/sundials_cvode_static.lib",
            "-lC:/vcpkg/installed/x64-windows-static/lib/sundials_nvecserial_static.lib",
            "-lC:/vcpkg/installed/x64-windows-static/lib/sundials_core_static.lib"
          ]
        }]
      ]
    }
  ]
}