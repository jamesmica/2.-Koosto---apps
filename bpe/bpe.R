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

get_address <- function(longitude, latitude) {
  # Utilisation de tryCatch pour gérer les erreurs
  result <- tryCatch({
    response <- httr::GET(paste0("https://api-adresse.data.gouv.fr/reverse/?lon=", longitude, "&lat=", latitude))
    if (httr::status_code(response) != 200) {
      stop("Failed to fetch address")
    }
    address_data <- httr::content(response, "parsed")
    if (length(address_data$features) > 0) {
      return(address_data$features[[1]]$properties$label)
    } else {
      return(NA)
    }
  }, error = function(e) {
    message("Error in fetching address for: ", longitude, ", ", latitude, " - ", e$message)
    return(NA)  # Retourne NA en cas d'erreur
  })
  return(result)
}



# Appliquer la fonction pour chaque ligne
bpe1$Adresse <- mapply(get_address, bpe1$Longitude, bpe1$Latitude)

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

openxlsx::write.xlsx(MED,"inf/inf.xlsx")
openxlsx::write.xlsx(MED,"pedpod/pedpod.xlsx")
openxlsx::write.xlsx(MED,"mk/mk.xlsx")
openxlsx::write.xlsx(MED,"psy/psy.xlsx")
openxlsx::write.xlsx(MED,"med/med.xlsx")


