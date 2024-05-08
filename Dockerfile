# Base image https://hub.docker.com/u/rocker/
FROM rocker/shiny:latest

# system libraries of general use
## install debian packages
RUN apt-get update -qq && apt-get -y --no-install-recommends install \
    libxml2-dev \
    build-essential \
    liblzma-dev \
    libbz2-dev \
    libglpk40 \
    libcairo2-dev \
    libsqlite3-dev \
    libmariadbd-dev \
    libpq-dev \
    libssh2-1-dev \
    unixodbc-dev \
    libcurl4-openssl-dev \
    libssl-dev

## update system libraries
RUN apt-get update && \
    apt-get upgrade -y && \
    apt-get clean

# copy necessary files
## app folder
COPY /BIG_app ./app
## renv.lock file
#COPY /BIG_app/renv.lock ./renv.lock

# Use all package repositories. Install app dependencies.
RUN R -e 'setRepositories(ind=1:7); install.packages(c("updog", "ggplot2", "VariantAnnotation", "SNPRelate", "adegenet", "future", "scales", "AGHmatrix", "stats", "factoextra", "readxl", "ggrepel", "dplyr", "shiny", "shinydashboard","randomcoloR","plotly", "DT","RColorBrewer", "dichromat", "bs4Dash", "shinyWidgets","data.table", "matrixcalc","Matrix", "shinyalert","rrBLUP", "tidyverse"))'

# "GWASpoly" is not in any of the repositories, install from GitHub (https://github.com/jendelman/GWASpoly/).
RUN R -e 'install.packages("devtools"); devtools::install_github("jendelman/GWASpoly", build_vignettes=FALSE)'

# install renv & restore packages
#RUN Rscript -e 'install.packages("renv")'
#RUN Rscript -e 'renv::restore()'

# expose port
EXPOSE 3838

# run app on container start
CMD ["R", "-e", "shiny::runApp('/app', host='0.0.0.0', port=3838)"]
#CMD ["R", "-e", "shiny::runApp('/app')"]
