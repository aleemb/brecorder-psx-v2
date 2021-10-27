This was abandoned due to Mac promiscuous mode issues, that may require messing with some security settings.

The mockfeed is good enough for our purposes.

### Links
https://github.com/buger/goreplay

https://github.com/buger/goreplay/wiki/Saving-and-Replaying-from-file
sudo ./gor --input-raw :9060 --output-file 9060.log

https://github.com/buger/goreplay/wiki/Capturing-and-replaying-traffic

https://github.com/buger/goreplay/wiki/Capturing-and-replaying-traffic
sudo ./gor --input-raw :9060 --input-raw-engine "raw_socket" --output-stdout

sudo ./gor --input-raw :8000 --output-stdout

Video Tutorial
https://www.youtube.com/watch?v=CxuKZcMKaW4
