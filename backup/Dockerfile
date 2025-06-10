FROM postgres:15-alpine

RUN apk add --no-cache python3 py3-pip redis
RUN pip3 install schedule

COPY backup.py /backup.py

CMD ["python3", "/backup.py"]
