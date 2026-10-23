#!/usr/bin/env perl
use strict;
use warnings;

# tells json to use UTF-8 layer - required for use of degree character ° used below in json processing
use utf8;   

# import Library for WWW (LWP) UserAgent to submit and receive web requests, i.e., access REST APIs on other sites     
use LWP::UserAgent;

# import PurePerl JSON module, used to encode and decode JSON data
# use JSON::PP;

use JSON::XS;       # Or use JSON;

# import unicode module
# use Encode qw(encode_utf8); 
# use Encode qw(decode encode);

################################################################
# PREPARE WEB API REQUEST ######################################
################################################################

# define target location: latitude, longitude and elevation of Zugspitze peak
my $latitude  = "47.42";   # note: my used to localize this variable, if omitted $latitude becomes a global variable
my $longitude = "10.98";
my $elevation = "2962";

# open-meteo API requires no API key, and uses Deutscher Wetterdienst models
# access reference pages at https://open-meteo.com/en/docs  # note: '.' concatenates strings together

#$ my $url = "https://single-runs-api.open-meteo.com/v1/forecast?latitude=52.52&longitude=13.41&hourly=temperature_2m&models=ecmwf_ifs";

my $url = " https://api.open-meteo.com/v1/forecast?latitude=52.52&longitude=13.41&hourly=temperature_2m,apparent_temperature,precipitation,snowfall,snow_depth,wind_speed_10m,cloud_cover_low,cloud_cover_mid,visibility&forecast_days=3&wind_speed_unit=mph"
# my $url = "https://open-meteo.com?" . 
# my $url = "https://api.open-meteo.com/v1/forecast?" .
#           "latitude=$latitude" . 
#           "&longitude=$longitude" .
#           "&elevation=$elevation" .
#           "&hourly=temperature_2m,apparent_temperature,precipitation,snowfall,snow_depth,wind_speed_10m,wind_gusts_10m,cloud_cover_low,cloud_cover_mid,visibility" .
#           "&wind_speed_unit=mph" .
#           "&forecast_days=2";          # collect total of 48 hours of forecast data

# set agent to wait on website response no more than 15 seconds, or fail
my $myAgent = LWP::UserAgent->new(timeout => 15); 

# set an agent profile string to mimic a human user so we get past the robot-drone-killers
$myAgent->agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
$myAgent->default_header("Accept" => "application/json");

# submit GET request to url with params, assign returned value to $response local var
my $response = $myAgent->get($url);

# return the failure error status number ie 400 and content, UNLESS success, in which case continue execution
die "API Request Failed (" . $response->status_line . "): " . $response->content 
    unless $response->is_success; 
# note: above equivalent to below:
# $response->is_success or die "API Request Failed: (" . $response->status_line . "): " . $response->decoded_content




################################################################
# PROCESS RECEIVED JSON ########################################
################################################################

# decodes and translates JSON response into Perl data structure for processing, likely array reference @example
# my $data = decode_json($response->content);
my $api_payload = $response->content;

# attempt to decode the JSON response
my $data;
eval {
    $data = decode_json($api_payload);
};
if ($@) {
    # If decode_json crashes, capture the error ($@) and dump the server output
    print STDERR "JSON Parsing Failed: $@\n";
    print STDERR "================== RAW SERVER RESPONSE ==================\n";
    print STDERR $api_payload . "\n";
    print STDERR "=========================================================\n";
    die "Stopping execution due to malformed payload.\n";
}

# assigned nested array of hourly data points to $hourly local var
my $hourly = $data->{hourly};

# prepare output report structure, for eventual saving to output file
# note: 'scalar gmtime()' creates human readable time_stamp for now, this moment in execution 
# assigns value 1 to safe, and empty array to reasons
my %report = (
    meta => { generated_at => scalar gmtime() . " UTC" },   
    next_24h => { safe => 1, reasons => [] },               
    next_48h => { safe => 1, reasons => [] }
);

# Loop over all the hourly (array) data points
 # "scalar(@{$hourly->{time}})" equates to the LENGTH of $hourly array, "@{i}" reference array by index i.
for my $i (0 .. scalar(@{$hourly->{time}}) - 1) {          
    my $temp_c       = $hourly->{temperature_2m}->[$i];
    my $feels_like_c = $hourly->{apparent_temperature}->[$i];
    my $precip       = $hourly->{precipitation}->[$i]; 
    my $snowfall     = $hourly->{snowfall}->[$i];
    my $snow_depth   = $hourly->{snow_depth}->[$i];  
    my $wind         = $hourly->{wind_speed_10m}->[$i];
    my $gust         = $hourly->{wind_gusts_10m}->[$i];
    my $low_clouds   = $hourly->{cloud_cover_low}->[$i];
    my $mid_clouds   = $hourly->{cloud_cover_mid}->[$i];
    my $visibility   = $hourly->{visibility}->[$i];

    # append error messages to array of strings on the fly, as input variable conditions test true 
    my @risk_reasons; # add elements to risk_reasons array of strings
         # Temperature & apparent temperature in celcius because Europe; if farenheit needed, include API format field
    push @risk_reasons, "Low temperatures <-5 C" if $temp_c < -5; # celcius
    push @risk_reasons, "Freezing windchill <-5 C" if $feels_like_c < -5; # celcius
         # Winds (adjusted for high alpine ridge estimated unsafe gusts)
    push @risk_reasons, "Windspeed >30 mph" if $wind > 30; # mph
    push @risk_reasons, "Wind gusts >40 mph" if $gust > 40; # mph
         # Moisture & winter conditions
    push @risk_reasons, "Precipitation >1mm/hr" if $precip > 1.0; # mm
    push @risk_reasons, "Snowfall expected >1cm/hr" if $snowfall > 1.0; # cm
    push @risk_reasons, "Snow accumulation >5cm" if $snow_depth > 0.05; # meters
         # Visibility & storm cloud coverage
    push @risk_reasons, ">20% cloudy at low elevations 0-3 km" if $low_clouds > 20; 
    push @risk_reasons, ">50% cloudy at med elevations 3-8 km" if $mid_clouds > 50; # tbd, poss 70?
    push @risk_reasons, "Visibility <2km" if $visibility < 2000; # test value 2000m = 6000ft 

    if (@risk_reasons) { # if array contains any elements
        if ($i < 24) {
            # within 24 hours
            $report{next_24h}->{safe} = 0; # set next_24h->safe to 0, indicating unsafe conditions
            push @{$report{next_24h}->{reasons}}, @risk_reasons; # push risk_reasons array to next_24h->reasons
        } elsif ($i < 48) {
            # 24-48 hours   
            $report{next_48h}->{safe} = 0;
            push @{$report{next_48h}->{reasons}}, @risk_reasons;
        } # anything 48 hours or higher is ignored currently (48 is the 49th hour)
    }
}

# Clean up duplicate reasons (in cases where unfavorable conditions met at consecutive hour segments)
for my $period (qw(next_24h next_48h)) {    # note: 'qw' is quoted words, is another way to write: ("next_24h" "next_48h")
                                            # essentially it runs through each period (loops once for each variable = period)
    my %seen; # define new local hashmap var  

    # remove duplicate items from an array while retaining original order   # resultant array of reasons, is assigned values by... 
    @{ $report{$period}->{reasons} } =                        
    grep { !$seen{$_}++ } @{$report{$period}->{reasons}};     # grep goes through array @{} item by item, only passes one of each unique valie 

    if ($report{$period}->{safe}) {                           # define message to include as content if no risk_hazards flags
        push @{$report{$period}->{reasons}}, "No risk conditions noted.</a>";
    }
}

        # Fix: Convert the structures to a flat structure first, then explicitly serialize with encode_utf8
        # my $raw_json_text = JSON::PP->new->pretty(1)->encode(\%report);
        # my $clean_bytes   = encode_utf8($raw_json_text);

        # this encoding should work, since no unicode in json
        # my $json_text = JSON::PP->new->pretty(1)->encode(\%report);

# FIX 3: Force the JSON encoder to spit out clean, raw UTF-8 bytes using ->utf8(1).
# We switch to JSON::XS (or JSON) here to make sure it handles the object methods gracefully.
my $json_bytes = JSON::XS->new->pretty(1)->utf8(1)->encode(\%report);

# Because $json_bytes is already raw UTF-8 data, we write it using standard sequential binary/byte mode '>'
open(my $filehandle, '>', 'weather_status.json') or die "Could not open file: $!";
print $filehandle $json_bytes;
close($filehandle);


# # Write results to a static JSON file that your web page can fetch, ">" changes to ">:utf8" to work with unicode chars like °
# open(my $filehandle, '>', 'weather_status.json') or die "Could not open file: $!";

# # safe $report in json format to file $filehandle, and close file
# print $filehandle $json_text;
# close($filehandle);

# print success/completion message
print "Weather analysis complete! status saved to weather_status.json\n";
