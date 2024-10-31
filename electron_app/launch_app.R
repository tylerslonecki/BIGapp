# library(golem)
# options(shiny.port = 1234)
# options(shiny.host = '0.0.0.0')
# BIGapp::run_app()


library(golem)
options(shiny.host = '127.0.0.1')
shiny_port <- httpuv::randomPort()
cat(sprintf("Selected port: %d\n", shiny_port))
BIGapp::run_app(options = list(port = shiny_port, launch.browser = FALSE))
