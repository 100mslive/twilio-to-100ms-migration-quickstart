## Setup Requirements

Before we begin, we need to collect all the config values we need to run the application:

- App Access Key: Used to authenticate - [you'll get one here](https://dashboard.100ms.live/developer).
- App Secret: Used to authenticate - [just like the above, you'll get one here](https://dashboard.100ms.live/developer).

## Setting Up The Application

Create a configuration file for your application:

```bash
cp .env.template .env
```

Edit `.env` with the configuration parameters we gathered from above.

Next, we need to install our dependencies from npm:

```bash
npm install
```

## Running The Application

Now we should be all set! Run the application:

```bash
npm start
```

You need to fetch room id and role name to render the url
- Room id - [you can room id from here](https://dashboard.100ms.live/rooms)
- Role name - Go to template page to know the role name

Your application should now be running at [http://localhost:3000?roomId=${Your-room-ID}&role=${Your-role-name}](http://localhost:3000?roomId=&role=). You will
be prompted to test and choose your microphone and camera. On desktop browsers, your choices will
be saved. _On mobile browsers, you will be asked to test and choose your microphone and camera every
time you load the application in order to make sure they are not reserved by another application_.

After choosing your input devices, you will be prompted to enter your User name, following
which you will join the Room. Now, all you have to do is open another tab and join the same Room in order
to see and hear yourself on both tabs!
