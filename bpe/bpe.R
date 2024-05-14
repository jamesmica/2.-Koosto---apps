library(tidyr)
library(dplyr)
library(magrittr)
library(tidyverse)

bpe <- read.csv("C:/Users/james/Downloads/bpe21_ensemble_xy_csv/bpe21_ensemble_xy.csv",sep = ";")

bpe1 <- bpe[,c(4,5,7,8,9,10,21)]

bpe1 <- bpe1 %>% 
  filter(LAMBERT_X != "") %>%
  filter(nchar(DEP) < 3)

bpe1 <- bpe1 %>%
  filter(TYPEQU %in% c("D232","D233", "D237","D243","D201"))
library(sf)

# Définir le système de coordonnées source et cible
crs_lambert <- 2154  # Lambert-93
crs_wgs84 <- 4326    # WGS-84

# Créer une colonne SF point à partir des coordonnées Lambert
bpee_sf <- st_as_sf(bpe1, coords = c("LAMBERT_X", "LAMBERT_Y"), crs = crs_lambert)

# Transformer les coordonnées en WGS-84
bpee_sf_wgs84 <- st_transform(bpee_sf, crs_wgs84)

# Extraire les coordonnées transformées
bpe1$Longitude <- st_coordinates(bpee_sf_wgs84)[,1]
bpe1$Latitude <- st_coordinates(bpee_sf_wgs84)[,2]


# Appliquer la fonction pour chaque ligne


INF <- bpe1 %>%
  filter(TYPEQU == "D232")

PEDPOD <- bpe1 %>%
  filter(TYPEQU == "D237")
  
MK <- bpe1 %>%
  filter(TYPEQU == "D233")
  
PSY <- bpe1 %>%
  filter(TYPEQU == "D243")
  
MED <- bpe1 %>%
  filter(TYPEQU == "D201")

openxlsx::write.xlsx(INF,"inf/inf.xlsx")
openxlsx::write.xlsx(PEDPOD,"pedpod/pedpod.xlsx")
openxlsx::write.xlsx(MK,"mk/mk.xlsx")
openxlsx::write.xlsx(PSY,"psy/psy.xlsx")
openxlsx::write.xlsx(MED,"med/med.xlsx")


